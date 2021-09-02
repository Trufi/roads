import { ClientGraphEdge } from './graph/type';
import { getSegment } from './graph/utils';

export interface EdgeWithDirection {
    edge: ClientGraphEdge;
    forward: boolean;
}

export interface Route {
    fromAt: number;
    edges: EdgeWithDirection[];
    toAt: number;
}

export function getRouteGeometry(route: Route) {
    const { fromAt, edges, toAt } = route;
    const coordinates: number[][] = [];

    const firstEdge = edges[0];
    const lastEdge = edges[edges.length - 1];

    if (firstEdge.edge === lastEdge.edge) {
        coordinates.push(...getPartGeometry(firstEdge.edge, fromAt, toAt));
    } else {
        coordinates.push(...getPartGeometry(firstEdge.edge, fromAt, firstEdge.forward ? 1 : 0));

        for (let i = 1; i < edges.length - 1; i++) {
            const edge = edges[i];

            if (edge.forward) {
                for (let j = 0; j < edge.edge.geometry.length - 1; j++) {
                    coordinates.push(edge.edge.geometry[j]);
                }
            } else {
                for (let j = edge.edge.geometry.length - 1; j > 0; j--) {
                    coordinates.push(edge.edge.geometry[j]);
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
