import { EventEmitter } from '@trufi/utils/common/eventEmitter';
import { ClientGraphEdge } from './graph/type';
import { getSegment } from './graph/utils';
import { pathfindFromMidway } from './pathfind';
import { Route } from './route';

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
        this.position.edge.points.add(this);
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

        this.position.edge.points.delete(this);

        this.route.fromAt = fromAt;
        this.route.edges = edges;
        this.route.toAt = toAt;
        this.edgeIndexInRoute = 0;

        this.position.at = fromAt;
        this.position.edge = edges[0].edge;
        this.position.edge.points.add(this);

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

        if (!hasFreeSpaceForMoving(position.edge, this.forward, this.position.at)) {
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
                const edge = this.route.edges[this.edgeIndexInRoute + 1];

                if (!hasFreeSpaceForMoving(edge.edge, edge.forward, edge.forward ? 0 : 1)) {
                    return;
                }

                this.edgeIndexInRoute++;
                position.at = edge.forward ? 0 : 1;

                position.edge.points.delete(this);
                position.edge = edge.edge;
                position.edge.points.add(this);

                this.forward = edge.forward;
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
}

function hasFreeSpaceForMoving(edge: ClientGraphEdge, thisForward: boolean, thisAt: number) {
    for (const anotherPoint of edge.points) {
        if (anotherPoint.forward !== thisForward) {
            continue;
        }

        const anotherAt = anotherPoint.position.at;

        if ((thisForward && anotherAt < thisAt) || (!thisForward && anotherAt > thisAt)) {
            continue;
        }

        if (anotherAt === thisAt) {
            continue;
        }

        if (Math.abs(anotherAt - thisAt) * edge.length < distanceBetween) {
            return false;
        }
    }

    return true;
}
