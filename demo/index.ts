/// <reference path="../node_modules/@2gis/mapgl/global.d.ts" />

import {
    circleIcon,
    createRandomFunction,
    mapPointFromLngLat,
    mapPointToLngLat,
} from '@trufi/utils';
import { DataGraph, getRouteGeometry, Point, PointPosition, Roads } from '../src';

const center = [82.91395527317273, 55.02479004260136];

const map = new mapgl.Map('map', {
    key: '042b5b75-f847-4f2a-b695-b5f58adc9dfd',
    center,
    zoom: 15,
});

map.on('click', (ev) => console.log(ev.lngLat));

window.addEventListener('resize', () => map.invalidateSize());

fetch('./data.json')
    .then((res) => res.json())
    .then(initialize);

const radius = 100 * 1000 * 0.3;

function initialize(data: DataGraph) {
    const roads = new Roads(data);

    const points: Array<{
        point: Point;
        marker: mapgl.Marker;
    }> = [];

    const iconRadius = 5;

    // const firstRoute = [
    //     [82.91605265372532, 55.02425812836841],
    //     [82.91395527317273, 55.02479004260136],
    //     [82.91562046805761, 55.02546767752546],
    //     [82.91776869529488, 55.02503778130044],
    // ];

    // const secondRoute = [
    //     [82.91234338317402, 55.02391800400252],
    //     [82.91395527317273, 55.02479004260136],
    //     [82.9122339936905, 55.02515278410664],
    //     [82.91020612086614, 55.0243424630069],
    // ];

    // const firstPositions = firstRoute
    //     .map((coords) => roads.findNearestVertex(mapPointFromLngLat(coords)))
    //     .filter((x) => x !== undefined) as PointPosition[];

    // const secondPositions = secondRoute
    //     .map((coords) => roads.findNearestVertex(mapPointFromLngLat(coords)))
    //     .filter((x) => x !== undefined) as PointPosition[];

    let t = 0;

    const blueIcon = circleIcon('#0000ffaa', iconRadius);
    const redIcon = circleIcon('#ff0000aa', iconRadius);

    function createPoint(positions: PointPosition[]) {
        let positionIndex = 0;
        const point = roads.createPoint({
            speed: 15,
            position: positions[positionIndex],
        });

        const marker = new mapgl.Marker(map, {
            coordinates: mapPointToLngLat(point.getCoords()),
            icon: blueIcon,
            size: [iconRadius * 2, iconRadius * 2],
            label: {
                text: `${t++}`,
                fontSize: 6,
            },
        });
        function getNextRoute() {
            setTimeout(() => {
                positionIndex = (positionIndex + 1) % positions.length;
                point.moveTo(positions[positionIndex]);
                marker.setIcon({ icon: positionIndex === 0 ? redIcon : blueIcon });
            }, 200);
        }
        point.on('routefinish', getNextRoute);
        getNextRoute();

        point.on('move', () => {
            marker.setCoordinates(mapPointToLngLat(point.getCoords()));
        });

        points.push({ point, marker });
    }

    for (let i = 0; i < 150; i++) {
        const p1 = roads.findNearestVertex(
            randomPoint(mapPointFromLngLat([82.90924472972655, 55.02796089761976]), radius),
        );
        const p2 = roads.findNearestVertex(
            mapPointFromLngLat([82.91766991102091, 55.018603142452356]),
        );

        const p3 = roads.findNearestVertex(
            randomPoint(mapPointFromLngLat([82.92660709614076, 55.020146858929685]), radius),
        );

        if (!p1 || !p2 || !p3) {
            continue;
        }

        new mapgl.Marker(map, {
            coordinates: mapPointToLngLat(p1.coords),
            label: {
                text: `1`,
            },
        });
        new mapgl.Marker(map, {
            coordinates: mapPointToLngLat(p2.coords),
            label: {
                text: `2`,
            },
        });
        new mapgl.Marker(map, {
            coordinates: mapPointToLngLat(p3.coords),
            label: {
                text: `3`,
            },
        });
        createPoint([p1, p2]);
        createPoint([p3, p2]);
        // createPoint([p2, p1], circleIcon('#ff0000aa', iconRadius));
    }
    // for (let i = 0; i < 15; i++) {
    //     createPoint(secondPositions, circleIcon('#ff0000aa', iconRadius));
    // }
}

const random = createRandomFunction(235345634);
function randomPoint(center: number[], radius: number) {
    const angle = Math.PI * 2 * random();
    const d = random() * radius;

    return [center[0] + Math.cos(angle) * d, center[1] + Math.sin(angle) * d];
}
