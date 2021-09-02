import { EventEmitter } from '@trufi/utils/common/eventEmitter';
import { applyDefaults } from '@trufi/utils/common/applyDefaults';
import { prepareGraph } from './graph';
import { DataGraph, ClientGraph } from './graph/type';
import { getSegment } from './graph/utils';
import { VertexFinder } from './graph/vertexFinder';
import { Point, PointInitialData, PointPosition } from './point';

export interface RoadsEvents {
    update: undefined;
}

export interface RoadsOptions {
    /**
     * Enable auto update every frame. True by default.
     */
    autoUpdate?: boolean;
}

const defaultOptions: Required<RoadsOptions> = {
    autoUpdate: true,
};

export class Roads extends EventEmitter<RoadsEvents> {
    public readonly graph: ClientGraph;
    private options: Required<RoadsOptions>;
    private points: Point[] = [];
    private vertexFinder: VertexFinder;

    constructor(dataGraph: DataGraph, options: RoadsOptions = defaultOptions) {
        super();

        this.options = applyDefaults(options, defaultOptions);
        this.graph = prepareGraph(dataGraph);
        this.vertexFinder = new VertexFinder(this.graph);

        if (this.options.autoUpdate) {
            requestAnimationFrame(this.updateLoop);
        }
    }

    public findNearestVertex(coordinates: number[], minDistance = Infinity) {
        return this.vertexFinder.findNearest(coordinates, minDistance);
    }

    public createPoint(data: PointInitialData) {
        const point = new Point(data);
        this.points.push(point);
        return point;
    }

    public removePoint(point: Point) {
        this.points = this.points.filter((p) => p !== point);
    }

    public getPositionCoords(position: PointPosition) {
        const { coords } = getSegment(position.edge, position.at);
        return coords;
    }

    public update(time: number) {
        this.points.forEach((point) => point.updateMoving(time));
        this.emit('update');
    }

    private updateLoop = () => {
        requestAnimationFrame(this.updateLoop);
        const time = Date.now();
        this.update(time);
    };
}
