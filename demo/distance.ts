/// <reference path="../node_modules/@2gis/mapgl/global.d.ts" />
import { circleIcon, mapPointFromLngLat, mapPointToLngLat } from '@trufi/utils';
import { DataGraph, Point, PointPosition, Roads } from '../src';

import type { FeatureCollection } from 'geojson';

export function startDistanceExample() {
    const center = [82.91395527317273, 55.02479004260136];

    const style: any = {
        name: 'empty',
        version: 1,
        background: {
            color: '#fff',
        },
        layers: [
            {
                id: 'roads',
                type: 'line',
                filter: ['match', ['sourceAttr', 'name'], ['roads'], true, false],
                style: {
                    color: '#000',
                    width: 1,
                },
            },
        ],
    };
    const map = new mapgl.Map('map', {
        key: '042b5b75-f847-4f2a-b695-b5f58adc9dfd',
        center,
        zoom: 18,
        style,
        styleOptions: {
            fontsPath: 'http://localhost:8080/fonts',
        },
    });
    window.addEventListener('resize', () => map.invalidateSize());

    map.on('click', (ev) => console.log(ev.lngLat));

    fetch('./data.json')
        .then((res) => res.json())
        .then(initialize);

    function initialize(data: DataGraph) {
        new mapgl.Marker(map, {
            coordinates: [82.91395527317273, 55.02479004260136],
            icon: circleIcon('#00ff00aa', 15),
            size: [15, 15],
            label: { text: 'Stop', fontSize: 12 },
        });

        const roads = new Roads(data, {
            autoUpdate: false,
        });

        const geojson: FeatureCollection = {
            type: 'FeatureCollection',
            features: [],
        };
        roads.graph.edges.forEach((edge) => {
            const lngLatGeometry = edge.geometry.map(mapPointToLngLat);
            geojson.features.push({
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: lngLatGeometry,
                },
            });
        });
        new mapgl.GeoJsonSource(map, {
            data: geojson,
            attributes: {
                name: 'roads',
            },
        });

        const iconRadius = 5;

        const firstRoute = [
            [82.91605265372532, 55.02425812836841],
            [82.91395527317273, 55.02479004260136],
            [82.91562046805761, 55.02546767752546],
            [82.91776869529488, 55.02503778130044],
        ];
        firstRoute.forEach((p) => {
            new mapgl.Marker(map, { coordinates: p });
        });

        const secondRoute = [
            [82.91234338317402, 55.02391800400252],
            [82.91395527317273, 55.02479004260136],
            [82.9122339936905, 55.02515278410664],
            [82.91020612086614, 55.0243424630069],
        ];

        const firstPositions = firstRoute
            .map((coords) => roads.findNearestVertex(mapPointFromLngLat(coords)))
            .filter((x) => x !== undefined) as PointPosition[];

        const secondPositions = secondRoute
            .map((coords) => roads.findNearestVertex(mapPointFromLngLat(coords)))
            .filter((x) => x !== undefined) as PointPosition[];

        let markerIndex = 0;

        const blueIcon = circleIcon('#0000ffaa', iconRadius);
        const redIcon = circleIcon('#ff0000aa', iconRadius);

        const points: Point[] = [];

        function createPoint(positions: PointPosition[], icon: string, speed: number) {
            let positionIndex = 0;
            const point = roads.createPoint({
                speed,
                position: positions[positionIndex],
                keepingDistance: 100 * 10,
                deceleration: 5 / 1000,
                acceleration: 5 / 1000,
            });

            const marker = new mapgl.Marker(map, {
                coordinates: mapPointToLngLat(point.getCoords()),
                icon,
                size: [iconRadius * 2, iconRadius * 2],
                label: {
                    text: `${markerIndex++}`,
                    fontSize: 6,
                },
                zIndex: 1,
            });
            marker.on('click', () => {
                console.log(point);
            });
            function getNextRoute() {
                setTimeout(
                    () => {
                        positionIndex = (positionIndex + 1) % positions.length;
                        point.moveTo(positions[positionIndex]);
                    },
                    positionIndex === 1 ? 3000 : 0,
                );
            }
            point.on('routefinish', getNextRoute);
            getNextRoute();

            point.on('move', () => {
                marker.setCoordinates(mapPointToLngLat(point.getCoords()));
            });

            points.push(point);
        }

        for (let i = 0; i < 10; i++) {
            createPoint(firstPositions, blueIcon, 8);
            createPoint(secondPositions, redIcon, 5);
        }

        const speedButton = document.createElement('button');
        speedButton.innerText = 'Change speed';
        let slow = false;
        speedButton.addEventListener('click', () => {
            slow = !slow;
            console.log('Speed slow', slow);
        });
        document.querySelector('.info').appendChild(speedButton);

        let lastUpdateTime = Date.now();

        function updateLoop() {
            requestAnimationFrame(updateLoop);
            const now = Date.now();

            const k = slow ? 0.1 : 1;

            const dt = (now - lastUpdateTime) * k;

            points.forEach((point) => {
                point.updateMoving(dt);
            });

            lastUpdateTime = now;
        }
        requestAnimationFrame(updateLoop);
    }
}
