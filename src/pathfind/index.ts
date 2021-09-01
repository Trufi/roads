import { ClientGraphEdge, ClientGraphVertex } from '../graph/type';
import { getSegment } from '../graph/utils';
import { PointPosition } from '../point';
import { Route } from '../route';
import { FlatQueue } from './flatqueue';

const list = new FlatQueue<ClientGraphVertex>();

/**
 * Счетчик идентификаторов "поиска пути".
 * Идентификаторы меняются каждый раз при запуске алгоритма и используются для пометок обработанных вершин графа.
 */
let idCounter = 0;

export type PathfindHeuristicFunction = (
    current: ClientGraphVertex,
    edge: ClientGraphEdge,
    next: ClientGraphVertex,
) => number;

/**
 * Поиск пути между точками.
 * Точки могут находится не только на вершинах графа, но и где-то на звеньях.
 */
export function pathfindFromMidway(
    from: PointPosition,
    to: PointPosition,
    heuristic?: PathfindHeuristicFunction,
): Route | undefined {
    if (from.edge === to.edge) {
        const { a, b } = from.edge;
        const vertices = from.at < to.at ? [a, b] : [b, a];
        return {
            fromAt: from.at,
            toAt: to.at,
            vertices,
        };
    }

    // Если точки "от" и "до" не на вершинах графа,
    // то создаем искусственные вершины для корректной работы алгоритма.
    let fromVertex: ClientGraphVertex;
    if (from.at === 0) {
        fromVertex = from.edge.a;
    } else if (from.at === 1) {
        fromVertex = from.edge.b;
    } else {
        const { vertex, leftEdge, rightEdge } = createArtificialVertexAndEdges(from);
        vertex.edges.push(leftEdge, rightEdge);
        fromVertex = vertex;
    }

    let toVertex: ClientGraphVertex;
    if (to.at === 0) {
        toVertex = to.edge.a;
    } else if (to.at === 1) {
        toVertex = to.edge.b;
    } else {
        const { vertex, leftEdge, rightEdge } = createArtificialVertexAndEdges(to);
        vertex.edges.push(leftEdge, rightEdge);
        toVertex = vertex;
        leftEdge.a.pathFind.artificialEdge = leftEdge;
        rightEdge.b.pathFind.artificialEdge = rightEdge;
    }

    if (!heuristic) {
        // Функция эвристики по умолчанию просто dx + dy между следующим вектором и конечным
        heuristic = (_current, _edge, next) => {
            return (
                Math.abs(next.coords[0] - toVertex.coords[0]) +
                Math.abs(next.coords[1] - toVertex.coords[1])
            );
        };
    }

    // Алгоритм поиска пути
    let path = pathfind(fromVertex, toVertex, heuristic);
    if (!path) {
        return;
    }

    // Удаляем созданные искусственные вершины
    if (fromVertex.type === 'artificial') {
        path[0] = anotherEdgeVertex(from.edge, path[1]);
    }

    if (toVertex.type === 'artificial') {
        toVertex.edges[0].a.pathFind.artificialEdge = undefined;
        toVertex.edges[1].b.pathFind.artificialEdge = undefined;
        path[path.length - 1] = anotherEdgeVertex(to.edge, path[path.length - 2]);
    }

    return {
        fromAt: from.at,
        toAt: to.at,
        vertices: path,
    };
}

function createArtificialVertexAndEdges(position: PointPosition) {
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
    };

    const { leftEdge, rightEdge } = splitEdgeByVertex(position.edge, segmentIndex, vertex);
    return { vertex, leftEdge, rightEdge };
}

function splitEdgeByVertex(edge: ClientGraphEdge, segmentIndex: number, vertex: ClientGraphVertex) {
    const leftEdge: ClientGraphEdge = {
        index: -1,
        enabled: true,
        type: 'artificial',
        pollution: 0,
        length: 0,
        geometry: [],
        a: edge.a,
        b: vertex,
    };

    const rightEdge: ClientGraphEdge = {
        index: -1,
        enabled: true,
        type: 'artificial',
        pollution: 0,
        length: 0,
        geometry: [],
        a: vertex,
        b: edge.b,
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

function pathfind(
    firstVertex: ClientGraphVertex,
    endVertex: ClientGraphVertex,
    heuristic: PathfindHeuristicFunction,
) {
    const id = idCounter++;

    list.clear();

    firstVertex.pathFind.f = 0;
    firstVertex.pathFind.g = 0;
    firstVertex.pathFind.id = id;
    firstVertex.pathFind.parent = undefined;

    list.push(firstVertex, 0);

    let current = list.pop();
    while (current && current !== endVertex) {
        for (const edge of getVertexEdges(current)) {
            const next = anotherEdgeVertex(edge, current);
            if (next.pathFind.id !== id) {
                next.pathFind.g = current.pathFind.g + edge.length;
                next.pathFind.f = next.pathFind.g + heuristic(current, edge, next);
                next.pathFind.parent = current;
                next.pathFind.id = id;
                list.push(next, next.pathFind.f);
            }
            // TODO: надо обновить позицию существующего элемента в очереди https://github.com/qiao/PathFinding.js/blob/master/src/finders/AStarFinder.js#L116
        }

        current = list.pop();
    }

    // Был найден путь, соберем его вершины
    if (current) {
        const route: ClientGraphVertex[] = [];

        let first: ClientGraphVertex | undefined = current;
        while (first) {
            route.push(first);
            first = first.pathFind.parent;
        }

        route.reverse();

        return route;
    }
}

/**
 * Обход графа в ширину
 */
export function breadthFirstTraversal(
    firstVertex: ClientGraphVertex,
    callback: (g: number, routeLength: number) => boolean,
    heuristic: PathfindHeuristicFunction = () => 0,
) {
    const id = idCounter++;

    list.clear();

    const priorityList = new FlatQueue<ClientGraphVertex>();

    firstVertex.pathFind.f = 0;
    firstVertex.pathFind.g = 0;
    firstVertex.pathFind.routeLength = 0;
    firstVertex.pathFind.id = id;
    firstVertex.pathFind.parent = undefined;

    list.push(firstVertex, 0);

    let current = list.pop();
    while (current && callback(current.pathFind.g, current.pathFind.routeLength)) {
        for (const edge of getVertexEdges(current)) {
            const next = anotherEdgeVertex(edge, current);
            if (next.pathFind.id !== id) {
                next.pathFind.routeLength = current.pathFind.routeLength + 1;
                next.pathFind.g = current.pathFind.g + heuristic(current, edge, next);
                next.pathFind.f = -next.pathFind.g;
                next.pathFind.parent = current;
                next.pathFind.id = id;
                list.push(next, next.pathFind.routeLength);
                priorityList.push(next, -next.pathFind.g);
            }
        }

        current = list.pop();
    }

    // Был найден путь
    if (current) {
        const route: ClientGraphVertex[] = [];

        let first: ClientGraphVertex | undefined = priorityList.pop();
        while (first) {
            route.push(first);
            first = first.pathFind.parent;
        }

        route.reverse();

        return route;
    }
}

function getVertexEdges(vertex: ClientGraphVertex) {
    if (vertex.pathFind.artificialEdge) {
        return [vertex.pathFind.artificialEdge, ...vertex.edges];
    }

    return vertex.edges;
}

function anotherEdgeVertex(edge: ClientGraphEdge, from: ClientGraphVertex) {
    return edge.a === from ? edge.b : edge.a;
}
