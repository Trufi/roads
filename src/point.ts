import { EventEmitter } from '@trufi/utils/common/eventEmitter';
import { ClientGraphEdge } from './graph/type';
import { getSegment } from './graph/utils';
import { pathfindFromMidway } from './pathfind';
import { EdgeWithDirection, Route } from './route';

const distanceBetween = 10 * 100;

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

    public forward = true;
    private lastUpdateTime = 0;
    private nextPointOnEdge?: Point;
    private prevPointOnEdge?: Point;

    public position: PointPosition;
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

        if (this.prevPointOnEdge?.nextPointOnEdge === this) {
            this.prevPointOnEdge.nextPointOnEdge = this.nextPointOnEdge;
        }
        if (this.nextPointOnEdge?.prevPointOnEdge === this) {
            this.nextPointOnEdge.prevPointOnEdge = this.prevPointOnEdge;
        }
        const prevEdge = this.position.edge;
        if (prevEdge.forwardLastPoint === this) {
            prevEdge.forwardLastPoint = this.nextPointOnEdge;
        } else if (prevEdge.reverseLastPoint === this) {
            prevEdge.reverseLastPoint = this.nextPointOnEdge;
        }

        this.route.fromAt = fromAt;
        this.route.edges = edges;
        this.route.toAt = toAt;
        this.edgeIndexInRoute = 0;

        this.position.at = fromAt;
        this.position.edge = edges[0].edge;

        this.forward = edges[0].forward;

        this.updatePointConnectionsOnEdge();
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

        if (!this.hasSpaceForMovingOnCurrentEdge()) {
            return;
        }

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
        let nextAt: number;
        if (this.forward) {
            nextAt = position.at + dx;
            remain = endAt - nextAt;
        } else {
            nextAt = position.at - dx;
            remain = nextAt - endAt;
        }

        // Сравнение не строгое, т.к. remain === 0 при edge.length === 0
        if (remain <= 0) {
            if (isFinalRouteEdge) {
                position.at = this.route.toAt;
            } else {
                const newEdge = this.route.edges[this.edgeIndexInRoute + 1];

                if (!this.hasSpaceForMovingOnNextEdge(newEdge)) {
                    return;
                }

                if (newEdge.forward) {
                    this.nextPointOnEdge = newEdge.edge.forwardLastPoint;
                    newEdge.edge.forwardLastPoint = this;
                } else {
                    this.nextPointOnEdge = newEdge.edge.reverseLastPoint;
                    newEdge.edge.reverseLastPoint = this;
                }
                if (this.nextPointOnEdge) {
                    this.nextPointOnEdge.prevPointOnEdge = this;
                }
                if (this.prevPointOnEdge) {
                    this.prevPointOnEdge.nextPointOnEdge = undefined;
                    this.prevPointOnEdge = undefined;
                }

                this.edgeIndexInRoute++;
                position.at = newEdge.forward ? 0 : 1;

                position.edge = newEdge.edge;

                this.forward = newEdge.forward;
            }

            if (this.isFinishedRoute()) {
                this.emit('routefinish');
            }
        } else {
            position.at = nextAt;
        }

        this.emit('move', {
            edge: eventEdge,
            passedDistance: passedDistanceInEdge,
        });
    }

    private hasSpaceForMovingOnCurrentEdge(): Boolean {
        if (!this.nextPointOnEdge) {
            return true;
        }

        const nextPointAt = this.nextPointOnEdge.position.at;
        return (
            Math.abs(nextPointAt - this.position.at) * this.position.edge.length > distanceBetween
        );
    }

    private hasSpaceForMovingOnNextEdge(nextEdge: EdgeWithDirection): Boolean {
        const lastPoint = nextEdge.forward
            ? nextEdge.edge.forwardLastPoint
            : nextEdge.edge.reverseLastPoint;
        if (!lastPoint) {
            return true;
        }

        const thisAt = nextEdge.forward ? 0 : 1;
        const nextPointAt = lastPoint.position.at;
        return Math.abs(nextPointAt - thisAt) * nextEdge.edge.length > distanceBetween;
    }

    private updatePointConnectionsOnEdge() {
        let prevPoint: Point | undefined;
        let nextPoint = this.forward
            ? this.position.edge.forwardLastPoint
            : this.position.edge.reverseLastPoint;
        while (
            nextPoint !== undefined &&
            ((this.forward && nextPoint.position.at < this.position.at) ||
                (!this.forward && nextPoint.position.at > this.position.at))
        ) {
            prevPoint = nextPoint;
            nextPoint = nextPoint.nextPointOnEdge;
        }

        this.nextPointOnEdge = nextPoint;
        this.prevPointOnEdge = prevPoint;
    }
}
