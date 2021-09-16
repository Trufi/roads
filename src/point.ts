import { EventEmitter } from '@trufi/utils/common/eventEmitter';
import { ClientGraphEdge } from './graph/type';
import { getSegment } from './graph/utils';
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

export interface PointMoveEvent<E = any> {
    passedDistance: number;
    edge: ClientGraphEdge<E>;
}

export interface PointEvents {
    move: PointMoveEvent;
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
            edges: [{ edge: this.position.edge, forward: true }],
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
        const { fromAt, edges, toAt } = route;

        this.route.fromAt = fromAt;
        this.route.edges = edges;
        this.route.toAt = toAt;
        this.edgeIndexInRoute = 0;

        this.position.at = fromAt;
        this.position.edge = edges[0].edge;

        this.forward = edges[0].forward;
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
        const isFinalRouteEdge = this.edgeIndexInRoute === this.route.edges.length - 1;
        return isFinalRouteEdge && this.position.at === this.route.toAt;
    }

    public updateMoving(time: number) {
        if (this.lastUpdateTime === 0) {
            this.lastUpdateTime = time;
            return;
        }

        const { position } = this;

        const passedDistanceInEdge = this.speed * (time - this.lastUpdateTime);

        this.lastUpdateTime = time;
        const dx = position.edge.length ? passedDistanceInEdge / position.edge.length : 1;

        const isFinalRouteEdge = this.edgeIndexInRoute === this.route.edges.length - 1;
        if (isFinalRouteEdge && position.at === this.route.toAt) {
            return;
        }

        const eventEdge = position.edge;

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

        // Сравнение не строгое, т.к. remain === 0 при edge.length === 0
        if (remain <= 0) {
            if (isFinalRouteEdge) {
                position.at = this.route.toAt;
            } else {
                this.edgeIndexInRoute++;
                const edge = this.route.edges[this.edgeIndexInRoute];
                position.at = edge.forward ? 0 : 1;
                position.edge = edge.edge;
                this.forward = edge.forward;
            }

            if (this.isFinishedRoute()) {
                this.emit('routefinish');
            }
        }

        this.emit('move', {
            edge: eventEdge,
            passedDistance: passedDistanceInEdge,
        });
    }
}
