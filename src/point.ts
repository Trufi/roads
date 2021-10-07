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
    private next?: Point;
    private prev?: Point;

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

        // Удаляем точку с текущего ребра
        this.removeFromEdge();

        // Добавляем точку на новое ребро
        this.route.fromAt = fromAt;
        this.route.edges = edges;
        this.route.toAt = toAt;
        this.edgeIndexInRoute = 0;

        this.position.at = fromAt;
        this.position.edge = edges[0].edge;

        this.forward = edges[0].forward;

        this.updatePointConnections();
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

        if (!this.hasSpaceOnCurrentEdge()) {
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
                // Точки готова двигаться по следующему ребру:
                const newEdge = this.route.edges[this.edgeIndexInRoute + 1];
                // 1. Проверяем, есть ли там место для нее
                if (!this.hasSpaceOnNextEdge(newEdge)) {
                    return;
                }

                // 2. Удаляем информацию о точки со старого ребра
                this.removeFromEdge();

                // 3. Добавляем на новое ребро в начало пути, но в конец списка точек
                if (newEdge.forward) {
                    this.next = newEdge.edge.forwardLastPoint;
                    newEdge.edge.forwardLastPoint = this;
                } else {
                    this.next = newEdge.edge.reverseLastPoint;
                    newEdge.edge.reverseLastPoint = this;
                }

                // 4. Устанавливаем связь со следующей точкой
                if (this.next) {
                    this.next.prev = this;
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

    /**
     * Проверяет, есть ли на текущем ребре место для движения.
     */
    private hasSpaceOnCurrentEdge(): Boolean {
        if (!this.next) {
            return true;
        }
        const nextPointAt = this.next.position.at;
        return (
            Math.abs(nextPointAt - this.position.at) * this.position.edge.length > distanceBetween
        );
    }

    /**
     * Проверяет, есть ли на следующем ребре место для появления этой точки.
     * Должен использоваться только при движении по пути,
     * когда точка закончила движения по ребру и собирается двигаться по следующему.
     */
    private hasSpaceOnNextEdge(nextEdge: EdgeWithDirection): Boolean {
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

    /**
     * Метод должен вызываться после вставки точки на ребро.
     * Ищет соседнии точки с новой, устанавливает связи между ними.
     */
    private updatePointConnections() {
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
            nextPoint = nextPoint.next;
        }

        this.next = nextPoint;
        this.prev = prevPoint;

        if (this.next) {
            this.next.prev = this;
        }
        if (this.prev) {
            this.prev.next = this;
        }
    }

    /**
     * 1. Соединяет предыдущую и следующую точку друг с другом
     * 2. Удаляет с ребра информацию о точке, если она была последней.
     * 3. Оставляет в ребре следующую точку, если она есть.
     *
     * Работает для:
     * - Удаляение точки с ребра при выставлении нового пути
     * - Удалении точки с ребра при переходе на следующее
     */
    private removeFromEdge() {
        if (this.prev?.next === this) {
            this.prev.next = this.next;
        }
        if (this.next?.prev === this) {
            this.next.prev = this.prev;
        }

        const edge = this.position.edge;
        if (edge.forwardLastPoint === this) {
            edge.forwardLastPoint = this.next;
        } else if (edge.reverseLastPoint === this) {
            edge.reverseLastPoint = this.next;
        }
    }
}
