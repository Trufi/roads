import { vec2dist } from '@trufi/utils/vec2/dist';
import { ClientGraphEdge } from '..';
import { ClientGraph, ClientGraphVertex, DataGraph } from './type';
import { unpackGraph } from './unpack';

export function prepareGraph(graph: DataGraph): ClientGraph {
    // Распаковываем граф пришедший с сервера
    unpackGraph(graph);

    const vertices: ClientGraphVertex[] = graph.vertices.map((vertex, index) => ({
        index,
        type: 'road',
        coords: vertex.coords,

        // Осталвяем пустой массив, заполним его позже
        edges: [],

        pathFind: {
            f: 0,
            g: 0,
            id: -1,
            routeLength: 0,
            parent: undefined,
        },
        userData: vertex.userData ?? {},
    }));

    const edges: ClientGraphEdge[] = graph.edges.map((edge, index) => ({
        index,
        type: 'road',

        // Заменяем индексы вершин на их ссылки для удобства в дальнейшем
        a: vertices[edge.a],
        b: vertices[edge.b],

        geometry: edge.geometry,
        oneWay: edge.oneWay,
        length: calcLineLength(edge.geometry),

        userData: edge.userData ?? {},
        points: new Set(),
        forwardLastPoint: undefined,
        reverseLastPoint: undefined,
    }));

    // Теперь в вершинах заменяем индексы граней на ссылки
    for (let i = 0; i < vertices.length; i++) {
        const clientVertex = vertices[i];
        const dataVertex = graph.vertices[i];
        clientVertex.edges = dataVertex.edges.map((edgeIndex) => edges[edgeIndex]);
    }

    const clientGraph: ClientGraph = {
        center: graph.center,
        min: graph.min,
        max: graph.max,
        vertices,
        edges,
        userData: graph.userData ?? {},
    };

    return clientGraph;
}

function calcLineLength(coords: number[][]) {
    let length = 0;

    for (let i = 1; i < coords.length; i++) {
        length += vec2dist(coords[i - 1], coords[i]);
    }

    return length;
}
