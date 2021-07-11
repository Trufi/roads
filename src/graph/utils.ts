import { clamp } from '@trufi/utils/common/clamp';
import { vec2dist } from '@trufi/utils/vec2/dist';
import { vec2lerp } from '@trufi/utils/vec2/lerp';
import { ClientGraphVertex, ClientGraphEdge } from './type';

export function findEdgeFromVertexToVertex(
    fromVertex: ClientGraphVertex,
    toVertex: ClientGraphVertex,
) {
    for (const edge of fromVertex.edges) {
        if (edge.a === fromVertex && edge.b === toVertex) {
            return {
                edge,
                forward: true,
            };
        }

        if (edge.a === toVertex && edge.b === fromVertex) {
            return {
                edge,
                forward: false,
            };
        }
    }
}

export function getSegment(edge: ClientGraphEdge, at: number) {
    const { length, geometry } = edge;
    const distance = length * at;

    let passed = 0;

    for (let i = 0; i < geometry.length - 1; i++) {
        const segmentLength = vec2dist(geometry[i], geometry[i + 1]);
        if (passed + segmentLength >= distance) {
            const coords = [0, 0];

            // Иногда из данных может прийти сегмент нулевой длины
            const positionAtSegment =
                segmentLength > 0 ? clamp((distance - passed) / segmentLength, 0, 1) : 0;

            vec2lerp(coords, geometry[i], geometry[i + 1], positionAtSegment);
            return {
                segmentIndex: i,
                positionAtSegment,
                coords,
            };
        }
        passed += segmentLength;
    }

    return {
        segmentIndex: 0,
        positionAtSegment: 0,
        coords: [0, 0],
    };
}

export function getAtFromSegment(
    edge: ClientGraphEdge,
    positionAtSegment: number,
    segmentIndex: number,
) {
    const { length, geometry } = edge;

    let passed = 0;

    for (let i = 0; i < segmentIndex; i++) {
        passed += vec2dist(geometry[i], geometry[i + 1]);
    }

    passed += vec2dist(geometry[segmentIndex], geometry[segmentIndex + 1]) * positionAtSegment;

    return passed / length;
}
