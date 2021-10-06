import { Point } from '..';

export interface DataGraphEdge {
    geometry: number[][];
    a: number;
    b: number;
    userData?: any;
}

export interface DataGraphVertex {
    id: number;
    edges: number[];
    coords: number[];
    userData?: any;
}

export interface DataGraph {
    formatVersion: number;
    center: number[];
    min: number[];
    max: number[];
    vertices: DataGraphVertex[];
    edges: DataGraphEdge[];
    userData?: any;
}

export interface ClientGraphVertex<V = any, E = any> {
    index: number;
    edges: ClientGraphEdge<E>[];
    coords: number[];
    type: 'road' | 'artificial';

    userData: V;

    /**
     * Инфа, которая используется для алгоритма поиска пути, в остальных случаях не нужно
     */
    pathFind: {
        id: number;
        f: number;
        g: number;

        /**
         * Используется для обхода в ширину и поиска лучшего путя для сбора снега
         */
        routeLength: number;

        /**
         * Предыдущая вершина после выполнения алгоритма поиска пути
         */
        parent: ClientGraphVertex<V> | undefined;

        artificialEdge?: ClientGraphEdge<E>;
    };
}

export interface ClientGraphEdge<E = any, V = any> {
    index: number;
    geometry: number[][];
    a: ClientGraphVertex<V>;
    b: ClientGraphVertex<V>;
    type: 'road' | 'artificial';

    /**
     * Длина геометрии грани
     */
    length: number;

    points: Set<Point>;

    userData: E;
}

export interface ClientGraph<G = any, E = any, V = any> {
    vertices: ClientGraphVertex<V>[];
    edges: ClientGraphEdge<E>[];
    center: number[];
    min: number[];
    max: number[];
    userData: G;
}
