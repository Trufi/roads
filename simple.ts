/// <reference path="../node_modules/@2gis/mapgl/global.d.ts" />
import { mapPointFromLngLat, mapPointToLngLat } from '@trufi/utils';
import { DataGraph, getRouteGeometry, Point, Roads } from '../src';

export function startSimpleExample() {
    const center = [82.92494, 55.0294];

    const map = new mapgl.Map('map', {
        key: '042b5b75-f847-4f2a-b695-b5f58adc9dfd',
        center,
        zoom: 14,
    });
    window.addEventListener('resize', () => map.invalidateSize());

    fetch('./data.json')
        .then((res) => res.json())
        .then(initialize);

    function initialize(data: DataGraph) {
        const roads = new Roads(data);
        const points: Array<{
            point: Point;
            marker: mapgl.Marker;
        }> = [];

        const mapCenter = mapPointFromLngLat(center);
        const radius = 100 * 3000;

        for (let i = 0; i < 5; i++) {
            const startVertex = roads.findNearestVertex(randomPoint(mapCenter, radius));
            if (startVertex) {
                const point = roads.createPoint({
                    position: startVertex,
                    speed: 50,
                });

                const startMoving = () => {
                    const moveToVertex = roads.findNearestVertex(randomPoint(mapCenter, radius));
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
                        fontSize: 10,
                    },
                    zIndex: 1,
                });

                let polyline: mapgl.Polyline | undefined;
                const drawPath = () => {
                    if (polyline) {
                        polyline.destroy();
                    }
                    polyline = new mapgl.Polyline(map, {
                        coordinates: getRouteGeometry(point.getRoute()).map((coords) =>
                            mapPointToLngLat(coords),
                        ),
                        color: '#ff000077',
                        width: 3,
                        zIndex: 0,
                    });
                };

                point.on('move', () => {
                    const coordinates = mapPointToLngLat(point.getCoords());
                    marker.setCoordinates(coordinates);
                    drawPath();
                });

                points.push({ point, marker });
            }
        }
    }

    function randomPoint(center: number[], radius: number) {
        const angle = Math.PI * 2 * Math.random();
        const d = Math.random() * radius;
        return [center[0] + Math.cos(angle) * d, center[1] + Math.sin(angle) * d];
    }
}
