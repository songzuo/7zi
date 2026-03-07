/**
 * Moltbook 验证挑战解决器
 * 
 * 解析混淆的数学问题并计算答案
 */

class VerificationSolver {
  /**
   * 解决验证挑战
   * @param {string} challengeText - 混淆的挑战文本
   * @returns {string} 答案 (带2位小数)
   */
  static solve(challengeText) {
    // 清理文本：移除符号和转换小写
    const cleaned = challengeText
      .replace(/[\[\]\{\}\(\)\^\~\`\\|]/g, '') // 移除符号
      .replace(/([a-z])([A-Z])/g, '$1 $2')    // 在大小写转换处加空格
      .toLowerCase();
    
    // 提取数字
    const numbers = this.extractNumbers(cleaned);
    
    // 提取操作符
    const operator = this.extractOperator(cleaned);
    
    if (numbers.length < 2 || !operator) {
      throw new Error('无法解析挑战');
    }
    
    // 计算结果
    const [a, b] = numbers;
    let result;
    
    switch (operator) {
      case '+':
        result = a + b;
        break;
      case '-':
        result = a - b;
        break;
      case '*':
        result = a * b;
        break;
      case '/':
        result = a / b;
        break;
      default:
        throw new Error(`未知操作符: ${operator}`);
    }
    
    return result.toFixed(2);
  }
  
  /**
   * 从文本中提取数字
   * @param {string} text
   * @returns {number[]}
   */
  static extractNumbers(text) {
    // 文本数字映射
    const wordToNumber = {
      'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
      'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
      'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
      'fourteen': 14, 'fifteen': 15, 'sixteen': 16,
      'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
      'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
      'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
      'hundred': 100
    };
    
    const numbers = [];
    const words = text.split(/\s+/);
    
    let currentNumber = 0;
    let hasNumber = false;
    
    for (const word of words) {
      // 尝试解析为数字
      const parsed = parseFloat(word);
      if (!isNaN(parsed)) {
        numbers.push(parsed);
        continue;
      }
      
      // 尝试解析为文字数字
      const lower = word.toLowerCase().replace(/[^a-z]/g, '');
      if (wordToNumber[lower] !== undefined) {
        const num = wordToNumber[lower];
        if (currentNumber === 0) {
          currentNumber = num;
        } else if (num === 100) {
          currentNumber *= 100;
        } else if (currentNumber < 100) {
          currentNumber += num;
        } else {
          currentNumber += num;
        }
        hasNumber = true;
      } else if (hasNumber) {
        numbers.push(currentNumber);
        currentNumber = 0;
        hasNumber = false;
      }
    }
    
    // 处理最后一个数字
    if (hasNumber) {
      numbers.push(currentNumber);
    }
    
    return numbers;
  }
  
  /**
   * 从文本中提取操作符
   * @param {string} text
   * @returns {string|null}
   */
  static extractOperator(text) {
    const lower = text.toLowerCase();
    
    // 操作符关键词
    const operators = {
      '+': ['plus', 'add', 'added to', 'and then adds', 'sum', 'total'],
      '-': ['minus', 'subtract', 'subtracted', 'less', 'slows by', 'decreases by', 'reduced by'],
      '*': ['times', 'multiplied by', 'multiplies'],
      '/': ['divided by', 'divides', 'per', 'split']
    };
    
    for (const [op, keywords] of Object.entries(operators)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          return op;
        }
      }
    }
    
    return null;
  }
}

module.exports = VerificationSolver;