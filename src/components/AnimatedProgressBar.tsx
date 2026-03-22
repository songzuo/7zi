'use client';

import { memo, useEffect, useState, useMemo, useRef } from 'react';

// ============================================================================
// 类型定义
// ============================================================================

interface AnimatedProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  animation?: 'smooth' | 'pulse' | 'glow' | 'striped-animated' | 'bounce' | 'steps';
  striped?: boolean;
  onComplete?: () => void;
  duration?: number;
}

// ============================================================================
// 常量配置
// ============================================================================

const SIZE_CLASSES = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
} as const;

const COLOR_CLASSES = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  gradient: 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500',
} as const;

const GLOW_COLORS = {
  blue: 'shadow-blue-500/50',
  green: 'shadow-green-500/50',
  red: 'shadow-red-500/50',
  yellow: 'shadow-yellow-500/50',
  purple: 'shadow-purple-500/50',
  gradient: 'shadow-purple-500/50',
} as const;

// ============================================================================
// 动画进度条组件
// ============================================================================

/**
 * AnimatedProgressBar 组件
 *
 * 支持多种动画效果:
 * 1. smooth - 平滑过渡
 * 2. pulse - 脉冲效果
 * 3. glow - 发光效果
 * 4. striped-animated - 条纹滚动
 * 5. bounce - 弹跳效果
 * 6. steps - 步进动画
 */
const AnimatedProgressBar = memo(function AnimatedProgressBar({
  value,
  max = 100,
  label,
  showPercentage = false,
  color = 'blue',
  size = 'md',
  animation = 'smooth',
  striped = false,
  onComplete,
  duration = 500,
}: AnimatedProgressBarProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const hasCompletedRef = useRef(false);

  const percentage = useMemo(
    () => Math.min(Math.max((value / max) * 100, 0), 100),
    [value, max]
  );

  // 使用 ref 存储动画状态，避免同步 setState 警告
  const animationRef = useRef<{
    animationFrame: number | null;
    startTime: number | null;
    startValue: number;
  }>({
    animationFrame: null,
    startTime: null,
    startValue: 0,
  });

  // 动画效果
  useEffect(() => {
    const animate = (timestamp: number) => {
      const animState = animationRef.current;
      if (animState.startTime === null) {
        animState.startTime = timestamp;
        animState.startValue = displayValue;
      }
      const elapsed = timestamp - animState.startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 缓动函数
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = animState.startValue + (percentage - animState.startValue) * easeOutCubic;

      // 使用 flushSync 模式更新，避免 cascading render 警告
      // 但这里我们用 ref 跟踪，只在动画完成时更新状态
      if (progress < 1) {
        setDisplayValue(currentValue);
        animState.animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(percentage);
        if (percentage >= 100 && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          setIsComplete(true);
          onComplete?.();
        }
      }
    };

    animationRef.current.animationFrame = requestAnimationFrame(animate);

    return () => {
      const animationFrame = animationRef.current.animationFrame;
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage, duration]);

  // 重置完成状态
  useEffect(() => {
    if (percentage < 100) {
      hasCompletedRef.current = false;
      setIsComplete(false);
    }
  }, [percentage]);

  const sizeClass = SIZE_CLASSES[size];
  const colorClass = COLOR_CLASSES[color];
  const glowClass = GLOW_COLORS[color];

  // 动画类名
  const getAnimationClass = () => {
    switch (animation) {
      case 'pulse':
        return 'animate-pulse';
      case 'glow':
        return `shadow-lg ${glowClass}`;
      case 'striped-animated':
        return 'bg-stripes-animated';
      case 'bounce':
        return isComplete ? 'animate-bounce' : '';
      default:
        return '';
    }
  };

  const barStyle = useMemo(
    () => ({ width: `${displayValue}%` }),
    [displayValue]
  );

  return (
    <div className="w-full" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className={`text-sm font-bold transition-all duration-300 ${
              isComplete
                ? 'text-green-500 scale-110'
                : 'text-zinc-900 dark:text-white'
            }`}>
              {Math.round(displayValue)}%
              {isComplete && ' ✓'}
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden ${sizeClass}`}>
        <div
          className={`${sizeClass} ${colorClass} ${striped ? 'bg-stripes' : ''} ${getAnimationClass()} rounded-full transition-all duration-300 ease-out relative overflow-hidden`}
          style={barStyle}
        >
          {/* 光效层 */}
          {animation === 'glow' && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          )}

          {/* 条纹动画 */}
          {(animation === 'striped-animated' || striped) && (
            <div className="absolute inset-0 bg-stripes-animated opacity-50" />
          )}
        </div>
      </div>

      {/* 完成动画 */}
      {isComplete && (
        <div className="mt-2 text-center animate-fade-in">
          <span className="text-green-500 text-sm font-medium">🎉 完成!</span>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// 波浪进度条组件
// ============================================================================

interface WaveProgressProps {
  value: number;
  max?: number;
  size?: number;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  showValue?: boolean;
  label?: string;
  duration?: number;
}

const WAVE_COLORS = {
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  yellow: '#f59e0b',
  purple: '#8b5cf6',
} as const;

export const WaveProgress = memo(function WaveProgress({
  value,
  max = 100,
  size = 100,
  color = 'blue',
  showValue = true,
  label,
  duration = 800,
}: WaveProgressProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const percentage = useMemo(
    () => Math.min(Math.max((value / max) * 100, 0), 100),
    [value, max]
  );

  // 使用 ref 存储动画状态
  const animStateRef = useRef({
    animationFrame: null as number | null,
    startTime: null as number | null,
    startValue: 0,
  });

  useEffect(() => {
    const durationValue = duration;
    animStateRef.current.startTime = Date.now();
    animStateRef.current.startValue = displayValue;

    const animate = () => {
      const animState = animStateRef.current;
      if (animState.startTime === null) return;

      const elapsed = Date.now() - animState.startTime;
      const progress = Math.min(elapsed / durationValue, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = animState.startValue + (percentage - animState.startValue) * easeOut;

      if (progress < 1) {
        setDisplayValue(currentValue);
        animState.animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(percentage);
      }
    };

    animStateRef.current.animationFrame = requestAnimationFrame(animate);

    return () => {
      const animationFrame = animStateRef.current.animationFrame;
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage]);

  const waveColor = WAVE_COLORS[color];

  return (
    <div
      className="relative rounded-full overflow-hidden border-4 border-zinc-200 dark:border-zinc-700"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      {/* 波浪层 */}
      <div
        className="absolute inset-x-0 bottom-0 transition-all duration-500"
        style={{
          height: `${displayValue}%`,
          backgroundColor: waveColor,
        }}
      >
        {/* 波浪 SVG */}
        <svg
          viewBox="0 0 120 12"
          className="absolute top-0 left-0 w-[200%] h-3 animate-wave"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 Q15,12 30,0 T60,0 T90,0 T120,0 V12 H0 Z"
            fill="white"
            fillOpacity="0.3"
          />
        </svg>
      </div>

      {/* 数值显示 */}
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <span className="text-xl font-bold text-zinc-900 dark:text-white drop-shadow-sm">
            {Math.round(displayValue)}%
          </span>
          {label && (
            <span className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// 分段进度条组件
// ============================================================================

interface SegmentedProgressProps {
  segments: number;
  current: number;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  showLabels?: boolean;
  labels?: string[];
  duration?: number;
}

export const SegmentedProgress = memo(function SegmentedProgress({
  segments,
  current,
  color = 'blue',
  size = 'md',
  animated = true,
  showLabels = false,
  labels,
  duration = 300,
}: SegmentedProgressProps) {
  const [animatedCurrent, setAnimatedCurrent] = useState(0);
  const animStateRef = useRef({
    animationFrame: null as number | null,
    startTime: null as number | null,
    startValue: 0,
  });

  useEffect(() => {
    if (animated) {
      const durationValue = duration;
      animStateRef.current.startTime = Date.now();
      animStateRef.current.startValue = animatedCurrent;

      const animate = () => {
        const animState = animStateRef.current;
        if (animState.startTime === null) return;

        const elapsed = Date.now() - animState.startTime;
        const progress = Math.min(elapsed / durationValue, 1);
        const currentValue = animState.startValue + (current - animState.startValue) * progress;

        if (progress < 1) {
          setAnimatedCurrent(currentValue);
          animState.animationFrame = requestAnimationFrame(animate);
        } else {
          setAnimatedCurrent(current);
        }
      };

      animStateRef.current.animationFrame = requestAnimationFrame(animate);

      return () => {
        const animationFrame = animStateRef.current.animationFrame;
        if (animationFrame !== null) {
          cancelAnimationFrame(animationFrame);
        }
      };
    } else {
      setAnimatedCurrent(current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, animated]);

  const sizeClass = SIZE_CLASSES[size];
  const colorClass = COLOR_CLASSES[color];

  return (
    <div className="w-full" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={segments}>
      <div className={`flex gap-1 ${sizeClass}`}>
        {Array.from({ length: segments }, (_, index) => {
          const isActive = index < Math.round(animatedCurrent);
          const isPartial = index === Math.floor(animatedCurrent) && animatedCurrent % 1 > 0;
          const fillPercent = isPartial ? (animatedCurrent % 1) * 100 : (isActive ? 100 : 0);

          return (
            <div
              key={index}
              className={`flex-1 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden relative ${sizeClass}`}
              title={labels?.[index] || `步骤 ${index + 1}`}
            >
              <div
                className={`absolute inset-y-0 left-0 ${colorClass} rounded-full transition-all duration-300`}
                style={{ width: `${fillPercent}%` }}
              />
              {isActive && (
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      {showLabels && labels && (
        <div className="flex justify-between mt-2">
          {labels.map((label, index) => (
            <span
              key={index}
              className={`text-xs transition-colors ${
                index < Math.round(animatedCurrent)
                  ? 'text-zinc-900 dark:text-white font-medium'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// 渐变动画进度条
// ============================================================================

interface GradientProgressProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  gradientColors?: string[];
  animated?: boolean;
  duration?: number;
}

export const GradientProgress = memo(function GradientProgress({
  value,
  max = 100,
  label,
  showPercentage = false,
  size = 'md',
  gradientColors = ['#3b82f6', '#8b5cf6', '#ec4899'],
  animated = true,
  duration = 600,
}: GradientProgressProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const percentage = useMemo(
    () => Math.min(Math.max((value / max) * 100, 0), 100),
    [value, max]
  );

  const animStateRef = useRef({
    animationFrame: null as number | null,
    startTime: null as number | null,
    startValue: 0,
  });

  useEffect(() => {
    if (animated) {
      const durationValue = duration;
      animStateRef.current.startTime = Date.now();
      animStateRef.current.startValue = displayValue;

      const animate = () => {
        const animState = animStateRef.current;
        if (animState.startTime === null) return;

        const elapsed = Date.now() - animState.startTime;
        const progress = Math.min(elapsed / durationValue, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = animState.startValue + (percentage - animState.startValue) * easeOut;

        if (progress < 1) {
          setDisplayValue(currentValue);
          animState.animationFrame = requestAnimationFrame(animate);
        } else {
          setDisplayValue(percentage);
        }
      };

      animStateRef.current.animationFrame = requestAnimationFrame(animate);

      return () => {
        const animationFrame = animStateRef.current.animationFrame;
        if (animationFrame !== null) {
          cancelAnimationFrame(animationFrame);
        }
      };
    } else {
      setDisplayValue(percentage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage, animated]);

  const sizeClass = SIZE_CLASSES[size];
  const gradientStyle = useMemo(
    () => ({
      width: `${displayValue}%`,
      backgroundImage: `linear-gradient(90deg, ${gradientColors.join(', ')})`,
      backgroundSize: '200% 100%',
    }),
    [displayValue, gradientColors]
  );

  return (
    <div className="w-full" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm font-bold text-zinc-900 dark:text-white">
              {Math.round(displayValue)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden ${sizeClass}`}>
        <div
          className={`${sizeClass} rounded-full transition-all duration-300 relative overflow-hidden ${animated ? 'animate-gradient-shift' : ''}`}
          style={gradientStyle}
        >
          {/* 光泽效果 */}
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/30" />
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// 带步骤标签的进度条
// ============================================================================

interface StepProgressProps {
  steps: { label: string; completed: boolean }[];
  currentStep?: number;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  orientation?: 'horizontal' | 'vertical';
}

export const StepProgress = memo(function StepProgress({
  steps,
  currentStep = 0,
  color = 'blue',
  orientation = 'horizontal',
}: StepProgressProps) {
  const colorClass = COLOR_CLASSES[color];
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={`flex ${isHorizontal ? 'flex-row items-center' : 'flex-col items-start'} gap-2`}
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={0}
      aria-valuemax={steps.length}
    >
      {steps.map((step, index) => {
        const isCompleted = step.completed || index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div
            key={index}
            className={`flex ${isHorizontal ? 'flex-col items-center' : 'flex-row items-center'} gap-2`}
          >
            {/* 步骤圆圈 */}
            <div
              className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                isCompleted
                  ? `${colorClass} text-white`
                  : isCurrent
                  ? 'ring-2 ring-offset-2 ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {isCompleted ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}

              {/* 当前步骤脉冲 */}
              {isCurrent && !isCompleted && (
                <div className={`absolute inset-0 rounded-full ${colorClass} opacity-30 animate-ping`} />
              )}
            </div>

            {/* 步骤标签 */}
            <span
              className={`text-sm ${
                isCompleted || isCurrent
                  ? 'text-zinc-900 dark:text-white font-medium'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {step.label}
            </span>

            {/* 连接线 */}
            {index < steps.length - 1 && isHorizontal && (
              <div className="flex-1 min-w-[40px] h-0.5 mx-2 bg-zinc-200 dark:bg-zinc-700 relative">
                <div
                  className={`absolute inset-y-0 left-0 ${colorClass} transition-all duration-500`}
                  style={{ width: isCompleted ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

export default AnimatedProgressBar;