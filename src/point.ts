import { EventEmitter } from '@trufi/utils';
import { ClientGraphEdge, ClientGraphVertex } from './graph/type';
import { findEdgeFromVertexToVertex, getSegment } from './graph/utils';
import { pathFindFromMidway } from './pathfind';

export interface PointPosition {
    edge: ClientGraphEdge;
    at: number;
}

export interface PointRoute {
    fromAt: number;
    vertices: ClientGraphVertex[];
    toAt: number;
    edgeIndexInRoute: number;
}

export interface PointInitialData {
    edge: ClientGraphEdge;
    at: number;
    speed: number;
    userData?: any;
}

export interface PointEvents {
    move: undefined;
}

export class Point extends EventEmitter<PointEvents> {
    public userData: any;
    private speed: number;

    private forward = true;
    private lastUpdateTime = 0;

    private position: PointPosition;
    private readonly route: PointRoute;

    constructor(data: PointInitialData) {
        super();

        this.route = {
            fromAt: data.at,
            toAt: data.at,
            vertices: [data.edge.a, data.edge.b],
            edgeIndexInRoute: 0,
        };

        this.speed = data.speed;
        this.userData = data.userData;
        this.position = { edge: data.edge, at: data.at };
    }

    public moveTo(toPosition: PointPosition) {
        const vertices = pathFindFromMidway(this.position, toPosition);
        if (!vertices) {
            console.log(`Not found path`);
            return;
        }

        const fromAt = this.position.at;
        const toAt = toPosition.at;

        const maybeEdge = findEdgeFromVertexToVertex(vertices[0], vertices[1]);
        if (!maybeEdge) {
            console.log(`Не найдена кривая пути`);
            return;
        }

        this.route.fromAt = fromAt;
        this.route.vertices = vertices;
        this.route.toAt = toAt;
        this.route.edgeIndexInRoute = 0;

        this.position.at = fromAt;
        this.position.edge = maybeEdge.edge;

        this.forward = maybeEdge.forward;
    }

    public getRoute() {
        return this.route;
    }

    public getSpeed() {
        return this.speed;
    }

    public getCoords() {
        const { coords } = getSegment(this.position.edge, this.position.at);
        return coords;
    }

    public getPosition() {
        return this.position;
    }

    public isFinishedRoute() {
        const isFinalRouteEdge = this.route.edgeIndexInRoute === this.route.vertices.length - 2;
        return isFinalRouteEdge && this.position.at === this.route.toAt;
    }

    public updateMoving(time: number) {
        const { position } = this;

        const passedDistanceInEdge = this.speed * (time - this.lastUpdateTime);

        this.lastUpdateTime = time;
        const dx = position.edge.length ? passedDistanceInEdge / position.edge.length : 1;

        const isFinalRouteEdge = this.route.edgeIndexInRoute === this.route.vertices.length - 2;
        if (isFinalRouteEdge && position.at === this.route.toAt) {
            return;
        }

        // Обновляем загрязнение дороги и начисляем очки
        // const nextPollution = clamp(position.edge.pollution - dx, 0, 1);
        // this.score += ((position.edge.pollution - nextPollution) * position.edge.length) / 1000;
        // position.edge.pollution = nextPollution;

        let endAt: number;
        if (isFinalRouteEdge) {
            endAt = this.route.toAt;
        } else {
            endAt = this.forward ? 1 : 0;
        }

        let remain: number;
        if (this.forward) {
            position.at = position.at + dx;
            remain = endAt - position.at;
        } else {
            position.at = position.at - dx;
            remain = position.at - endAt;
        }

        if (remain < 0) {
            if (isFinalRouteEdge) {
                position.at = this.route.toAt;
            } else {
                this.route.edgeIndexInRoute++;
                const maybeEdge = findEdgeFromVertexToVertex(
                    this.route.vertices[this.route.edgeIndexInRoute],
                    this.route.vertices[this.route.edgeIndexInRoute + 1],
                );
                if (maybeEdge) {
                    position.at = maybeEdge.forward ? 0 : 1;
                    position.edge = maybeEdge.edge;
                    this.forward = maybeEdge.forward;
                } else {
                    console.log(`Не найдена следующая кривая пути}`);
                }
            }
        }

        this.emit('move');
    }

    public getDebugInfo() {
        return {
            speed: this.speed,
            at: this.position.at,
            edge: this.position.edge.index,
        };
    }
}
