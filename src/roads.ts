import { EventEmitter } from '@trufi/utils';
import { prepareGraph } from './graph';
import { DataGraph, ClientGraph } from './graph/type';
import { VertexFinder } from './graph/vertexFinder';
import { Point, PointInitialData } from './point';

export interface RoadsEvents {
    update: undefined;
}

export class Roads extends EventEmitter<RoadsEvents> {
    private points: Point[] = [];
    private graph: ClientGraph;
    private vertexFinder: VertexFinder;

    constructor(dataGraph: DataGraph) {
        super();

        this.graph = prepareGraph(dataGraph);
        this.vertexFinder = new VertexFinder(this.graph);

        requestAnimationFrame(this.updateLoop);
    }

    public findNearestVertex(coordinates: number[], minDistance = Infinity) {
        return this.vertexFinder.findNearest(coordinates, minDistance);
    }

    public createPoint(data: PointInitialData) {
        const point = new Point(data);
        this.points.push(point);
        return point;
    }

    public update(time: number) {
        this.points.forEach((point) => point.updateMoving(time));
    }

    private updateLoop = () => {
        requestAnimationFrame(this.updateLoop);

        const time = Date.now();

        this.update(time);

        this.emit('update');
    };
}
