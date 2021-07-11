export interface DataGraphEdge {
    geometry: number[][];
    a: number;
    b: number;
}

export interface DataGraphVertex {
    id: number;
    edges: number[];
    coords: number[];
}

export interface DataGraph {
    formatVersion: number;
    center: number[];
    min: number[];
    max: number[];
    vertices: DataGraphVertex[];
    edges: DataGraphEdge[];
}

export interface ClientGraphVertex {
    index: number;
    edges: ClientGraphEdge[];
    coords: number[];
    type: 'road' | 'artificial';

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
        parent: ClientGraphVertex | undefined;

        artificialEdge?: ClientGraphEdge;
    };
}

export interface ClientGraphEdge {
    index: number;
    geometry: number[][];
    a: ClientGraphVertex;
    b: ClientGraphVertex;
    type: 'road' | 'artificial';

    pollution: number;

    enabled: boolean;

    /**
     * Длина геометрии грани
     */
    length: number;
}

export interface ClientGraph {
    vertices: ClientGraphVertex[];
    edges: ClientGraphEdge[];
    center: number[];
    min: number[];
    max: number[];
}
