import { vec2dist } from '@trufi/utils/vec2/dist';
import { ClientGraph, ClientGraphEdge, ClientGraphVertex, DataGraph } from './type';
import { unpackGraph } from './unpack';

export function prepareGraph(graph: DataGraph): ClientGraph {
    // Распаковываем граф пришедший с сервера
    unpackGraph(graph);

    // На самом деле этот тот же объект graph, мы его мутируем в процессе,
    // а отдельная переменная для TS
    const clientGraph: ClientGraph = graph as any;

    graph.vertices.forEach((vertex, index) => {
        const clientVertex: ClientGraphVertex = vertex as any;
        clientVertex.index = index;

        // Заменяем индексы граней на ссылки
        clientVertex.edges = vertex.edges.map((edgeIndex) => clientGraph.edges[edgeIndex]);

        clientVertex.pathFind = {
            f: 0,
            g: 0,
            id: -1,
            routeLength: 0,
            parent: undefined,
        };

        clientVertex.userData = vertex.userData ?? {};
    });

    graph.edges.forEach((edge, index) => {
        const clientEdge: ClientGraphEdge = edge as any;
        clientEdge.index = index;

        // Заменяем индексы вершин на их ссылки для удобства в дальнейшем
        clientEdge.a = clientGraph.vertices[edge.a];
        clientEdge.b = clientGraph.vertices[edge.b];

        clientEdge.length = calcLineLength(clientEdge.geometry);

        clientEdge.userData = edge.userData ?? {};

        clientEdge.points = new Set();
    });

    clientGraph.userData = graph.userData ?? {};

    return clientGraph;
}

function calcLineLength(coords: number[][]) {
    let length = 0;

    for (let i = 1; i < coords.length; i++) {
        length += vec2dist(coords[i - 1], coords[i]);
    }

    return length;
}
