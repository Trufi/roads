import { DataGraph } from './type';

const roundFactor = 100;
const supportedFormatVersion = 2;

export function unpackGraph(graph: DataGraph) {
    if (graph.formatVersion !== supportedFormatVersion) {
        console.warn(
            `Supported format version is only ${supportedFormatVersion}, but data graph format version is ${graph.formatVersion}`,
        );
    }

    let lastX = 0;
    let lastY = 0;

    function deltaDecodeVec2(p: number[]) {
        lastX = p[0] = p[0] + lastX;
        lastY = p[1] = p[1] + lastY;
    }

    let last = 0;
    function deltaDecode(ex: number) {
        last = ex + last;
        return last;
    }

    graph.vertices.forEach((v) => {
        deltaDecodeVec2(v.coords);

        v.coords[0] = v.coords[0] * roundFactor;
        v.coords[1] = v.coords[1] * roundFactor;

        v.coords[0] = v.coords[0] + graph.center[0];
        v.coords[1] = v.coords[1] + graph.center[1];

        v.edges = v.edges.map(deltaDecode);
    });

    graph.edges.forEach((e) => {
        e.a = deltaDecode(e.a);
        e.b = deltaDecode(e.b);
        e.oneWay = Boolean(e.oneWay);

        if (e.geometry === undefined) {
            e.geometry = [graph.vertices[e.a].coords, graph.vertices[e.b].coords];
        } else {
            e.geometry.forEach((v) => {
                deltaDecodeVec2(v);
                v[0] = v[0] * roundFactor;
                v[1] = v[1] * roundFactor;
                v[0] = v[0] + graph.center[0];
                v[1] = v[1] + graph.center[1];
            });
        }
    });
}
