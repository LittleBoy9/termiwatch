import * as v8 from 'v8';
import { HeapSpaceMetrics, HeapSpaceInfo } from '../types';

export class HeapCollector {
  collect(): HeapSpaceMetrics {
    const stats = v8.getHeapStatistics();
    const spaceStats = v8.getHeapSpaceStatistics();

    const spaces: HeapSpaceInfo[] = spaceStats.map((space) => ({
      name: space.space_name.replace(/_space$/, '').replace(/_/g, ' '),
      size: space.space_size,
      used: space.space_used_size,
      available: space.space_available_size,
      utilization:
        space.space_size > 0
          ? Math.round((space.space_used_size / space.space_size) * 1000) / 10
          : 0,
    }));

    return {
      spaces,
      totalHeapSize: stats.total_heap_size,
      totalHeapSizeExecutable: stats.total_heap_size_executable,
      totalPhysicalSize: stats.total_physical_size,
      heapSizeLimit: stats.heap_size_limit,
      mallocedMemory: stats.malloced_memory,
      doesZapGarbage: stats.does_zap_garbage === 1,
    };
  }
}
