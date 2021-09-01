import { EventEmitter } from '@trufi/utils';
import { ClientGraphEdge } from './graph/type';
import { findEdgeFromVertexToVertex, getSegment } from './graph/utils';
import { pathfindFromMidway } from './pathfind';
import { Route } from './route';

export interface PointPosition {
    edge: ClientGraphEdge;
    at: number;
}

export interface PointInitialData {
    position: PointPosition;
    speed: number;
    userData?: any;
}

export interface PointEvents {
    move: undefined;
    routefinish: undefined;
}

export class Point extends EventEmitter<PointEvents> {
    public userData: any;
    private speed: number;

    private forward = true;
    private lastUpdateTime = 0;

    private position: PointPosition;
    private edgeIndexInRoute: number;
    private readonly route: Route;

    constructor(data: PointInitialData) {
        super();

        this.speed = data.speed;
        this.userData = data.userData;
        this.position = {
            edge: data.position.edge,
            at: data.position.at,
        };

        this.route = {
            fromAt: this.position.at,
            toAt: this.position.at,
            vertices: [this.position.edge.a, this.position.edge.b],
        };
        this.edgeIndexInRoute = 0;
    }

    public moveTo(toPosition: PointPosition) {
        const route = pathfindFromMidway(this.position, toPosition);
        if (!route) {
            console.log(`Not found route`);
            return;
        }

        this.setRoute(route);
    }

    public setRoute(route: Route) {
        const { fromAt, vertices, toAt } = route;

        const maybeEdge = findEdgeFromVertexToVertex(vertices[0], vertices[1]);
        if (!maybeEdge) {
            console.log(`Не найдена кривая пути`);
            return;
        }

        this.route.fromAt = fromAt;
        this.route.vertices = vertices;
        this.route.toAt = toAt;
        this.edgeIndexInRoute = 0;

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
        const isFinalRouteEdge = this.edgeIndexInRoute === this.route.vertices.length - 2;
        return isFinalRouteEdge && this.position.at === this.route.toAt;
    }

    public updateMoving(time: number) {
        const { position } = this;

        const passedDistanceInEdge = this.speed * (time - this.lastUpdateTime);

        this.lastUpdateTime = time;
        const dx = position.edge.length ? passedDistanceInEdge / position.edge.length : 1;

        const isFinalRouteEdge = this.edgeIndexInRoute === this.route.vertices.length - 2;
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
                this.edgeIndexInRoute++;
                const maybeEdge = findEdgeFromVertexToVertex(
                    this.route.vertices[this.edgeIndexInRoute],
                    this.route.vertices[this.edgeIndexInRoute + 1],
                );
                if (maybeEdge) {
                    position.at = maybeEdge.forward ? 0 : 1;
                    position.edge = maybeEdge.edge;
                    this.forward = maybeEdge.forward;
                } else {
                    console.log(`Не найдена следующая кривая пути}`);
                }
            }

            if (this.isFinishedRoute()) {
                this.emit('routefinish');
            }
        }

        this.emit('move');
    }
}
