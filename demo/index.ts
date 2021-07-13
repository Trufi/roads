/// <reference path="../node_modules/@2gis/mapgl/global.d.ts" />

import { mapPointFromLngLat, mapPointToLngLat } from '@trufi/utils';
import { DataGraph, Point, Roads } from '../src';

const center = [82.92494, 55.0294];

const map = new mapgl.Map('map', {
    key: '042b5b75-f847-4f2a-b695-b5f58adc9dfd',
    center,
    zoom: 14,
});

fetch('./data.json')
    .then((res) => res.json())
    .then(initialize);

function initialize(data: DataGraph) {
    const roads = new Roads(data);
    const points: Array<{
        point: Point;
        marker: mapgl.Marker;
    }> = [];

    for (let i = 0; i < 5; i++) {
        const startVertex = roads.findNearestVertex(mapPointFromLngLat(randomPoint()));
        if (startVertex) {
            const { edge, at } = startVertex;
            const point = roads.createPoint({
                edge,
                at,
                speed: 50,
            });

            const startMoving = () => {
                const moveToVertex = roads.findNearestVertex(mapPointFromLngLat(randomPoint()));
                if (moveToVertex) {
                    point.moveTo(moveToVertex);
                }
            };

            point.on('routefinish', startMoving);
            startMoving();

            const marker = new mapgl.Marker(map, {
                coordinates: mapPointToLngLat(point.getCoords()),
                icon: './icon.svg',
                size: [16, 16],
                label: {
                    text: `${i}`,
                    offset: [0, 0],
                    fontSize: 12,
                },
            });

            point.on('move', () => {
                const coordinates = mapPointToLngLat(point.getCoords());
                marker.setCoordinates(coordinates);
            });

            points.push({ point, marker });
        }
    }
}

function randomPoint() {
    return [center[0] + (Math.random() - 0.5) * 0.06, center[1] + (Math.random() - 0.5) * 0.03];
}
