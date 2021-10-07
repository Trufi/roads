import { startDistanceExample } from './distance';
import { startSimpleExample } from './simple';

const exampleName = location.search.slice(1);

if (exampleName === 'distance') {
    startDistanceExample();
} else {
    startSimpleExample();
}
