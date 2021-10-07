import { ClientGraphEdge, ClientGraphVertex } from '../graph/type';
import { findEdgeFromVertexToVertex } from '../graph/utils';
import { PointPosition } from '../point';
import { EdgeWithDirection, Route } from '../route';
import { FlatQueue } from './flatqueue';
import { anotherEdgeVertex, createArtificialVertexAndEdges, getVertexEdges } from './utils';

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
 * Алгоритм поиска пути. Работает не только с вершинами графа, но и с промежуточными.
 * Если конечные точки пути являются промежуточными, то создает искусственные вершины для корректной работы алгоритма.
 */
export function pathfindFromMidway(
    from: PointPosition,
    to: PointPosition,
    heuristic?: PathfindHeuristicFunction,
): Route | undefined {
    if (from.edge === to.edge) {
        return {
            fromAt: from.at,
            toAt: to.at,
            edges: [{ edge: from.edge, forward: from.at < to.at }],
        };
    }

    /**
     * Создаем искусственные вершины, если точки "от" и "до" не на вершинах графа.
     */

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

    /**
     * Алгоритм поиска пути
     */
    let path = pathfind(fromVertex, toVertex, heuristic);
    if (!path) {
        return;
    }

    /**
     * Удаляем созданные искусственные вершины
     */

    // Искусственную вершины старта - это промежуточная вершина расположенная на грани from.
    // Вместо нее достаточно взять противоположную вершину грани from, которая не попала в путь.
    // Занулять ничего не нужно, т.к. ничто не указывает на искусственную веришну старта.
    if (fromVertex.type === 'artificial') {
        path[0] = anotherEdgeVertex(from.edge, path[1]);
    }

    // Искусственную вершины старта - это промежуточная вершина расположенная на грани to.
    // Вместо нее нужно взять противоположную вершину грани to, которая не попала в путь,
    // а также удалить ссылки вершин грани to на неё.
    if (toVertex.type === 'artificial') {
        toVertex.edges[0].a.pathFind.artificialEdge = undefined;
        toVertex.edges[1].b.pathFind.artificialEdge = undefined;
        path[path.length - 1] = anotherEdgeVertex(to.edge, path[path.length - 2]);
    }

    /**
     * Получаем массив граней с направлением движения из массива вершин поиска пути
     */
    const edges: EdgeWithDirection[] = [];
    for (let i = 0; i < path.length - 1; i++) {
        const first = path[i];
        const second = path[i + 1];
        const result = findEdgeFromVertexToVertex(first, second);
        if (!result) {
            throw new Error(`Не найдена грань между вершинами: ${first.index} и ${second.index}`);
        }
        edges.push(result);
    }

    /**
     * Проверяем, что первая и последняя грани совпадают с гранями юзера.
     * Алгоритм поиска работает с вершинами, поэтому "пустая грань", вполне могла схлопнуться.
     * Пустые грань - это та, по которой точке не нужно будет двигаться. Например, at = 0 и путь ведет в обратном направлении.
     */

    let fromAt = from.at;
    const firstEdge = edges[0];
    if (firstEdge.edge !== from.edge) {
        if (from.at === 0 || from.at === 1) {
            fromAt = firstEdge.forward ? 0 : 1;
        } else {
            throw new Error(
                `Первая грань составленная из вершин поиска пути ${firstEdge.edge.index} не равна исходной ${from.edge.index}`,
            );
        }
    }

    let toAt = to.at;
    const lastEdge = edges[edges.length - 1];
    if (lastEdge.edge !== to.edge) {
        if (to.at === 0 || to.at === 1) {
            toAt = lastEdge.forward ? 0 : 1;
        } else {
            throw new Error(
                `Последняя грань составленная из вершин поиска пути ${firstEdge.edge.index} не равна исходной ${to.edge.index}`,
            );
        }
    }

    return {
        fromAt,
        toAt,
        edges,
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
            if (edge.oneWay && edge.a !== current) {
                continue;
            }

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
 * Функция задающая приоритет вершин.
 * Если возвращает undefined, то обход графа в этом направлении останавливается.
 */
export type BreadthFirstTraversalPriority = (
    routeLength: number,
    next: ClientGraphVertex,
    current: ClientGraphVertex,
    edge: ClientGraphEdge,
) => number | undefined;

export function breadthFirstTraversalFromMidway(
    from: PointPosition,
    priorityFunction: BreadthFirstTraversalPriority,
): Route | undefined {
    // Если точки "от" не на вершине графа, то создаем искусственную вершину для корректной работы алгоритма.
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

    const path = breadthFirstTraversal(fromVertex, priorityFunction);
    if (!path || path.length < 2) {
        return;
    }

    // Удаляем созданные искусственные вершины
    // Искусственную вершины старта - это промежуточная вершина расположенная на грани from.
    // Вместо нее достаточно взять противоположную вершину грани from, которая не попала в путь.
    // Занулять ничего не нужно, т.к. ничто не указывает на искусственную веришну старта.
    if (fromVertex.type === 'artificial') {
        path[0] = anotherEdgeVertex(from.edge, path[1]);
    }

    /**
     * Получаем массив граней с направлением движения из массива вершин поиска пути
     */
    const edges: EdgeWithDirection[] = [];
    for (let i = 0; i < path.length - 1; i++) {
        const first = path[i];
        const second = path[i + 1];
        const result = findEdgeFromVertexToVertex(first, second);
        if (!result) {
            throw new Error(`Не найдена грань между вершинами: ${first.index} и ${second.index}`);
        }
        edges.push(result);
    }

    /**
     * Проверяем, что первая грань совпадает с гранью юзера.
     * Алгоритм поиска работает с вершинами, поэтому "пустая грань", вполне могла схлопнуться.
     * Пустые грань - это та, по которой точке не нужно будет двигаться. Например, at = 0 и путь ведет в обратном направлении.
     */
    let fromAt = from.at;
    const firstEdge = edges[0];
    if (firstEdge.edge !== from.edge) {
        if (from.at === 0 || from.at === 1) {
            fromAt = firstEdge.forward ? 0 : 1;
        } else {
            throw new Error(
                `Первая грань составленная из вершин поиска пути ${firstEdge.edge.index} не равна исходной ${from.edge.index}`,
            );
        }
    }

    const lastEdge = edges[edges.length - 1];
    const toAt = lastEdge.forward ? 1 : 0;

    return {
        fromAt,
        edges,
        toAt,
    };
}

/**
 * Обход графа в ширину
 */
function breadthFirstTraversal(
    firstVertex: ClientGraphVertex,
    priorityFunction: BreadthFirstTraversalPriority,
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
    priorityList.push(firstVertex, 0);

    let current = list.pop();
    while (current) {
        for (const edge of getVertexEdges(current)) {
            const next = anotherEdgeVertex(edge, current);

            if (next.pathFind.id === id) {
                continue;
            }

            const routeLength = current.pathFind.routeLength + 1;
            const priority = priorityFunction(routeLength, next, current, edge);

            if (priority !== undefined) {
                next.pathFind.routeLength = routeLength;
                next.pathFind.g = current.pathFind.g + priority;
                next.pathFind.f = 0;
                next.pathFind.parent = current;
                next.pathFind.id = id;
                list.push(next, next.pathFind.routeLength);
                priorityList.push(next, -next.pathFind.g);
            }
        }

        current = list.pop();
    }

    const route: ClientGraphVertex[] = [];
    let first: ClientGraphVertex | undefined = priorityList.pop();
    while (first) {
        route.push(first);
        first = first.pathFind.parent;
    }

    route.reverse();

    return route;
}
