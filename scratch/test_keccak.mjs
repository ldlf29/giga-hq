import { keccak256, toBytes } from 'viem';

const signature = 'RaceCreated(uint256,address,uint256,uint256,uint256,uint256,uint256)';
const hash = keccak256(toBytes(signature));
console.log('Event Hash:', hash);
