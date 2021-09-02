import { ClientGraphEdge, ClientGraphVertex } from '../graph/type';
import { getSegment } from '../graph/utils';
import { PointPosition } from '../point';

export function createArtificialVertexAndEdges(position: PointPosition) {
    const { segmentIndex, coords } = getSegment(position.edge, position.at);
    const vertex: ClientGraphVertex = {
        index: -1,
        coords,
        type: 'artificial',
        pathFind: {
            f: 0,
            g: 0,
            routeLength: 0,
            id: -1,
            parent: undefined,
        },
        edges: [],
        userData: {},
    };

    const { leftEdge, rightEdge } = splitEdgeByVertex(position.edge, segmentIndex, vertex);
    return { vertex, leftEdge, rightEdge };
}

function splitEdgeByVertex(edge: ClientGraphEdge, segmentIndex: number, vertex: ClientGraphVertex) {
    const leftEdge: ClientGraphEdge = {
        index: -1,
        type: 'artificial',
        length: 0,
        geometry: [],
        a: edge.a,
        b: vertex,
        userData: {},
    };

    const rightEdge: ClientGraphEdge = {
        index: -1,
        type: 'artificial',
        length: 0,
        geometry: [],
        a: vertex,
        b: edge.b,
        userData: {},
    };

    for (let i = 0; i < edge.geometry.length; i++) {
        if (i <= segmentIndex) {
            leftEdge.geometry.push(edge.geometry[i]);
        }

        if (i === segmentIndex) {
            leftEdge.geometry.push(vertex.coords);
            rightEdge.geometry.push(vertex.coords);
        }

        if (i > segmentIndex) {
            rightEdge.geometry.push(edge.geometry[i]);
        }
    }

    return {
        leftEdge,
        rightEdge,
    };
}

export function getVertexEdges(vertex: ClientGraphVertex) {
    if (vertex.pathFind.artificialEdge) {
        return [vertex.pathFind.artificialEdge, ...vertex.edges];
    }

    return vertex.edges;
}

export function anotherEdgeVertex(edge: ClientGraphEdge, from: ClientGraphVertex) {
    return edge.a === from ? edge.b : edge.a;
}
