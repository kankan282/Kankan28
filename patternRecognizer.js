import _ from 'lodash';

export class PatternRecognizer {
  static analyzeSequences(outcomes) {
    const patterns = {
      alternating: this.detectAlternating(outcomes),
      streaks: this.detectStreaks(outcomes),
      cycles: this.detectCycles(outcomes),
      clusters: this.detectClusters(outcomes)
    };
    
    return patterns;
  }

  static detectAlternating(outcomes) {
    if (outcomes.length < 3) return false;
    
    let isAlternating = true;
    for (let i = 2; i < outcomes.length; i++) {
      if (outcomes[i] === outcomes[i-1]) {
        isAlternating = false;
        break;
      }
    }
    
    return isAlternating;
  }

  static detectStreaks(outcomes) {
    const streaks = [];
    let currentStreak = 1;
    let currentType = outcomes[0];
    
    for (let i = 1; i < outcomes.length; i++) {
      if (outcomes[i] === outcomes[i-1]) {
        currentStreak++;
      } else {
        streaks.push({ type: currentType, length: currentStreak });
        currentStreak = 1;
        currentType = outcomes[i];
      }
    }
    
    streaks.push({ type: currentType, length: currentStreak });
    return streaks;
  }

  static detectCycles(outcomes, maxCycleLength = 5) {
    const cycles = [];
    
    for (let cycleLen = 2; cycleLen <= maxCycleLength; cycleLen++) {
      if (outcomes.length < cycleLen * 2) continue;
      
      let isCyclic = true;
      for (let i = 0; i < cycleLen; i++) {
        if (outcomes[i] !== outcomes[i + cycleLen]) {
          isCyclic = false;
          break;
        }
      }
      
      if (isCyclic) {
        cycles.push({
          length: cycleLen,
          pattern: outcomes.slice(0, cycleLen)
        });
      }
    }
    
    return cycles;
  }

  static detectClusters(outcomes) {
    const clusters = [];
    let clusterStart = 0;
    
    for (let i = 1; i <= outcomes.length; i++) {
      if (i === outcomes.length || outcomes[i] !== outcomes[i-1]) {
        clusters.push({
          type: outcomes[i-1],
          length: i - clusterStart,
          start: clusterStart,
          end: i - 1
        });
        clusterStart = i;
      }
    }
    
    return clusters;
  }

  static predictNextFromPatterns(patterns, recentOutcomes) {
    // Check for alternating pattern
    if (patterns.alternating) {
      return recentOutcomes[0] === 'BIG' ? 'SMALL' : 'BIG';
    }
    
    // Check for streaks
    const streaks = patterns.streaks;
    if (streaks.length > 0) {
      const currentStreak = streaks[streaks.length - 1];
      
      // If streak is short (<3), it might continue
      if (currentStreak.length < 3) {
        return currentStreak.type;
      }
      // If streak is long, expect reversal
      else {
        return currentStreak.type === 'BIG' ? 'SMALL' : 'BIG';
      }
    }
    
    // Check for cycles
    if (patterns.cycles.length > 0) {
      const cycle = patterns.cycles[0];
      const cycleIndex = recentOutcomes.length % cycle.length;
      return cycle.pattern[cycleIndex];
    }
    
    return null; // No clear pattern
  }
  }
