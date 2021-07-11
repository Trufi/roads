import { vec2dist } from '@trufi/utils/vec2/dist';
import RBush from 'rbush';
import { ClientGraphEdge, ClientGraphVertex, ClientGraph } from './type';
import { getAtFromSegment } from './utils';

export interface VertexFinderPosition {
    edge: ClientGraphEdge;

    at: number;

    /**
     * Индекс сегмента грани, с учетом направления,
     * т.е. если точка едет с конфа (forward === false), то индекса будет считаться с конца
     */
    segmentIndex: number;

    /**
     * Описывает местоположение на текущем сегменте грани
     * Задается от 0 до 1
     */
    positionAtSegment: number;

    coords: number[];
}

export class VertexFinder {
    private tree = new RBush<{ vertex: ClientGraphVertex }>();

    constructor(private graph: ClientGraph) {
        this.tree.load(this.graph.vertices.map((vertex) => createPoint(vertex.coords, vertex)));
    }

    public findNearest(point: number[], minDistance = Infinity) {
        const offset = 131072; // половина размера тайла 14-го зума

        const vertices = this.tree.search(createPointBBox(point, offset)).map((res) => res.vertex);
        const edgeIndices = new Set<number>();
        for (const vertex of vertices) {
            for (const edge of vertex.edges) {
                edgeIndices.add(edge.index);
            }
        }

        let nearest:
            | {
                  edge: ClientGraphEdge;
                  segmentIndex: number;
                  positionAtSegment: number;
                  coords: number[];
              }
            | undefined;

        edgeIndices.forEach((index) => {
            const edge = this.graph.edges[index];

            for (let i = 0; i < edge.geometry.length - 1; i++) {
                const closestPoint = nearestPointOnSegment(
                    point,
                    edge.geometry[i],
                    edge.geometry[i + 1],
                );
                const distance = vec2dist(point, closestPoint.point);

                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = {
                        edge,
                        segmentIndex: i,
                        positionAtSegment: closestPoint.t,
                        coords: closestPoint.point,
                    };
                }
            }
        });

        if (nearest) {
            const position: VertexFinderPosition = {
                edge: nearest.edge,
                segmentIndex: nearest.segmentIndex,
                positionAtSegment: nearest.positionAtSegment,
                coords: nearest.coords,
                at: getAtFromSegment(nearest.edge, nearest.positionAtSegment, nearest.segmentIndex),
            };
            return position;
        }
    }
}

function createPoint(point: number[], vertex: ClientGraphVertex) {
    return {
        minX: point[0],
        minY: point[1],
        maxX: point[0],
        maxY: point[1],
        vertex,
    };
}

function createPointBBox(point: number[], offset: number) {
    return {
        minX: point[0] - offset,
        minY: point[1] - offset,
        maxX: point[0] + offset,
        maxY: point[1] + offset,
    };
}

function nearestPointOnSegment(point: number[], segmentA: number[], segmentB: number[]) {
    const A = point[0] - segmentA[0];
    const B = point[1] - segmentA[1];
    const C = segmentB[0] - segmentA[0];
    const D = segmentB[1] - segmentA[1];

    const dot = A * C + B * D;
    const lengthSquared = C * C + D * D;
    const param = lengthSquared !== 0 ? dot / lengthSquared : 0;

    if (param < 0) {
        return {
            point: segmentA,
            t: 0,
        };
    } else if (param > 1) {
        return {
            point: segmentB,
            t: 1,
        };
    } else {
        return {
            point: [Math.round(segmentA[0] + param * C), Math.round(segmentA[1] + param * D)],
            t: param,
        };
    }
}
