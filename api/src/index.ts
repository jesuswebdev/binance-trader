import 'reflect-metadata';
import { init, start } from './server';

init().then(() => start());
