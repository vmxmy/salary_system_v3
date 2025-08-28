/**
 * 网络质量监测 Hook
 * 提供网络状态和超时配置的实时更新
 */

import { useState, useEffect } from 'react';
import { networkAwareTimeout, type NetworkQualityInfo } from '../../utils/network-aware-timeout';

export const useNetworkQuality = () => {
  const [networkInfo, setNetworkInfo] = useState<NetworkQualityInfo>(
    networkAwareTimeout.getNetworkInfo()
  );

  useEffect(() => {
    const unsubscribe = networkAwareTimeout.addListener(setNetworkInfo);
    return unsubscribe;
  }, []);

  return {
    networkInfo,
    quality: networkInfo.quality,
    timeouts: networkInfo.timeouts,
    isSlowNetwork: ['poor', 'fair'].includes(networkInfo.quality),
    isOffline: networkInfo.quality === 'offline',
    canHandleLargeFiles: networkAwareTimeout.canHandleLargeFiles(),
    shouldSaveData: networkAwareTimeout.shouldSaveData(),
    recommendedConcurrency: networkAwareTimeout.getRecommendedConcurrency(),
    refresh: () => networkAwareTimeout.refresh()
  };
};

export default useNetworkQuality;