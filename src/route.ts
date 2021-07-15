import { ClientGraphEdge, ClientGraphVertex } from './graph/type';
import { findEdgeFromVertexToVertex, getSegment } from './graph/utils';

export interface Route {
    fromAt: number;
    vertices: ClientGraphVertex[];
    toAt: number;
}

export function getRouteGeometry(route: Route) {
    const { fromAt, vertices, toAt } = route;
    const coordinates: number[][] = [];

    const firstEdge = findEdgeFromVertexToVertex(vertices[0], vertices[1]);
    const lastEdge = findEdgeFromVertexToVertex(
        vertices[vertices.length - 2],
        vertices[vertices.length - 1],
    );
    if (!firstEdge || !lastEdge) {
        throw new Error(`Не найдена кривая при отрисовки поиска пути`);
    }

    if (firstEdge.edge === lastEdge.edge) {
        coordinates.push(...getPartGeometry(firstEdge.edge, fromAt, toAt));
    } else {
        coordinates.push(...getPartGeometry(firstEdge.edge, fromAt, firstEdge.forward ? 1 : 0));

        for (let i = 1; i < vertices.length - 2; i++) {
            const a = vertices[i];
            const b = vertices[i + 1];

            const maybeEdge = findEdgeFromVertexToVertex(a, b);
            if (!maybeEdge) {
                throw new Error(`Не найдена кривая при отрисовки поиска пути`);
            }

            if (maybeEdge.forward) {
                for (let j = 0; j < maybeEdge.edge.geometry.length - 1; j++) {
                    coordinates.push(maybeEdge.edge.geometry[j]);
                }
            } else {
                for (let j = maybeEdge.edge.geometry.length - 1; j > 0; j--) {
                    coordinates.push(maybeEdge.edge.geometry[j]);
                }
            }
        }

        coordinates.push(...getPartGeometry(lastEdge.edge, lastEdge.forward ? 0 : 1, toAt));
    }

    return coordinates;
}

function getPartGeometry(edge: ClientGraphEdge, fromAt: number, toAt: number) {
    const coordinates: number[][] = [];
    const segmentFrom = getSegment(edge, fromAt);
    const segmentTo = getSegment(edge, toAt);

    coordinates.push(segmentFrom.coords);
    if (fromAt < toAt) {
        for (let i = segmentFrom.segmentIndex + 1; i <= segmentTo.segmentIndex; i++) {
            coordinates.push(edge.geometry[i]);
        }
    } else {
        for (let i = segmentFrom.segmentIndex; i > segmentTo.segmentIndex; i--) {
            coordinates.push(edge.geometry[i]);
        }
    }
    coordinates.push(segmentTo.coords);

    return coordinates;
}
