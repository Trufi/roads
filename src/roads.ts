import { prepareGraph } from './graph';
import { DataGraph, ClientGraph } from './graph/type';
import { VertexFinder } from './graph/vertexFinder';
import { Point, PointInitialData } from './point';

export class Roads {
    private graph: ClientGraph;
    private vertexFinder: VertexFinder;

    constructor(dataGraph: DataGraph) {
        this.graph = prepareGraph(dataGraph);
        this.vertexFinder = new VertexFinder(this.graph);
    }

    public findNearestVertex(coordinates: number[], minDistance = Infinity) {
        return this.vertexFinder.findNearest(coordinates, minDistance);
    }

    public createPoint(data: PointInitialData) {
        return new Point(data);
    }
}
