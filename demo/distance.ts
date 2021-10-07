/// <reference path="../node_modules/@2gis/mapgl/global.d.ts" />
import { circleIcon, mapPointFromLngLat, mapPointToLngLat } from '@trufi/utils';
import { DataGraph, Point, PointPosition, Roads } from '../src';

export function startDistanceExample() {
    const center = [82.91395527317273, 55.02479004260136];

    const map = new mapgl.Map('map', {
        key: '042b5b75-f847-4f2a-b695-b5f58adc9dfd',
        center,
        zoom: 18,
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
        const roads = new Roads(data);

        const points: Array<{
            point: Point;
            marker: mapgl.Marker;
        }> = [];

        const iconRadius = 5;

        const firstRoute = [
            [82.91605265372532, 55.02425812836841],
            [82.91395527317273, 55.02479004260136],
            [82.91562046805761, 55.02546767752546],
            [82.91776869529488, 55.02503778130044],
        ];

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

        function createPoint(positions: PointPosition[], icon: string, speed: number) {
            let positionIndex = 0;
            const point = roads.createPoint({
                speed,
                position: positions[positionIndex],
                keepingDistance: 100 * 10,
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
                    positionIndex === 1 ? 300 : 0,
                );
            }
            point.on('routefinish', getNextRoute);
            getNextRoute();

            point.on('move', () => {
                marker.setCoordinates(mapPointToLngLat(point.getCoords()));
            });

            points.push({ point, marker });
        }

        for (let i = 0; i < 20; i++) {
            createPoint(firstPositions, blueIcon, 8);
            createPoint(secondPositions, redIcon, 5);
        }
    }
}
