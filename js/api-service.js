// SEO Assistant API服务模块

/**
 * API服务类 - 处理所有外部API调用
 */
class ApiService {
  /**
   * 获取API设置
   * @returns {Promise<Object>} API设置对象
   */
  static async getApiSettings() {
    return await chrome.storage.sync.get([
      'aiService', 'aiApiKey', 
      'searchService', 'searchApiKey', 
      'semrushApiKey', 'serpApiKey',  // 添加这两个关键的API密钥
      'googleApiKey', 'googleCseId'
    ]);
  }

  /**
   * 验证API设置是否完整
   * @param {Object} settings - API设置对象
   * @returns {Object} 验证结果，包含isValid和missingSettings
   */
  static validateApiSettings(settings) {
    const missingSettings = [];
    
    if (!settings.aiApiKey) {
      missingSettings.push('AI API密钥');
    }
    
    if (!settings.searchApiKey) {
      missingSettings.push('搜索API密钥');
    }
    
    if (!settings.googleApiKey || !settings.googleCseId) {
      missingSettings.push('Google API设置');
    }
    
    return {
      isValid: missingSettings.length === 0,
      missingSettings
    };
  }

  /**
   * 获取关键词数据
   * @param {string} keyword - 目标关键词
   * @param {string} country - 国家/地区代码
   * @returns {Promise<Array>} 关键词数据
   */
  static async getKeywordData(keyword, country = 'cn') {
    try {
      const settings = await this.getApiSettings();
      const searchService = settings.searchService || 'semrush';
      
      // 根据搜索服务类型获取对应的API密钥
      let apiKey;
      if (searchService === 'semrush') {
        apiKey = settings.semrushApiKey;
      } else if (searchService === 'serpapi') {
        apiKey = settings.serpApiKey;
      } else {
        apiKey = settings.searchApiKey;
      }
      
      if (!apiKey) {
        throw new Error(`未设置${searchService}的API密钥`);
      }
      
      // 根据不同的搜索服务构建不同的API请求
      if (searchService === 'semrush') {
        // 使用代理服务器或后端API中转请求
        return await this.fetchWithProxy(
          `https://api.semrush.com/?type=phrase_this&key=${apiKey}&phrase=${encodeURIComponent(keyword)}&database=${country}&export_columns=Ph,Nq,Cp`,
          'GET'
        );
      } else if (searchService === 'serpapi') {
        // 使用代理服务器或后端API中转请求
        const response = await this.fetchWithProxy(
          `https://serpapi.com/search?q=${encodeURIComponent(keyword)}&gl=${country}&api_key=${apiKey}`,
          'GET'
        );
        
      console.log('关键词获取响应:', response);
        // 解析SerpAPI响应
        return (response.related_searches || []).map(item => ({
          keyword: item.query,
          volume: 0, // SerpAPI不提供搜索量
          competition: 0 // SerpAPI不提供竞争度
        }));
      } else {
        throw new Error('不支持的搜索服务类型');
      }
    } catch (error) {
      console.error('获取关键词数据出错:', error);
      // 返回模拟数据作为备选
      return this.getMockKeywordData(keyword);
    }
  }
  
  /**
   * 使用代理服务器或后端API中转请求
   * @param {string} url - 请求URL
   * @param {string} method - 请求方法
   * @param {Object} body - 请求体
   * @param {Object} customHeaders - 自定义请求头
   * @returns {Promise<any>} 响应数据
   */
  static async fetchWithProxy(url, method = 'GET', body = null, customHeaders = {}) {
    try {
      console.log('发起代理请求:', url);
      
      // 直接使用fetch，不通过消息传递
      const options = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...customHeaders
        }
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      console.log('请求选项:', {
        method: options.method,
        headers: Object.keys(options.headers),
        bodyLength: options.body ? options.body.length : 0
      });
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`请求失败: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // 根据内容类型解析响应
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error('代理请求出错:', error);
      throw error;
    }
  }
  
  /**
   * 从SerpAPI获取关键词数据
   * @param {string} keyword - 目标关键词
   * @param {string} country - 国家/地区代码
   * @param {string} apiKey - API密钥
   * @returns {Promise<Array>} 关键词数据数组
   */
  static async fetchSerpApiKeywords(keyword, country, apiKey) {
    const apiUrl = 'https://serpapi.com/search';
    const params = new URLSearchParams({
      q: keyword,
      gl: country,
      api_key: apiKey
    });
    
    const response = await fetch(`${apiUrl}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`SerpAPI请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.related_searches && data.related_searches.length > 0) {
      return data.related_searches.map(item => ({
        keyword: item.query,
        volume: Math.floor(Math.random() * 2000) + 500, // SerpAPI不直接提供搜索量，这里模拟
        competition: Math.random().toFixed(2)
      })).slice(0, 5);
    }
    
    throw new Error('SerpAPI未返回相关搜索数据');
  }

  /**
   * 从SEMrush获取关键词数据
   * @param {string} keyword - 目标关键词
   * @param {string} country - 国家/地区代码
   * @param {string} apiKey - API密钥
   * @returns {Promise<Array>} 关键词数据数组
   */
  static async fetchSemrushKeywords(keyword, country, apiKey) {
    const apiUrl = 'https://api.semrush.com/analytics/keywordresearch/v1/related';
    const params = new URLSearchParams({
      key: apiKey,
      phrase: keyword,
      database: country,
      export_columns: 'Ph,Nq,Cp,Co'
    });
    
    const response = await fetch(`${apiUrl}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`SEMrush API请求失败: ${response.status}`);
    }
    
    const data = await response.text();
    const lines = data.split('\n').filter(line => line.trim());
    
    if (lines.length > 1) { // 跳过标题行
      return lines.slice(1, 6).map(line => {
        const [keyword, volume, cpc, competition] = line.split(';');
        return {
          keyword: keyword,
          volume: parseInt(volume) || 0,
          competition: parseFloat(competition) || 0
        };
      });
    }
    
    throw new Error('SEMrush未返回相关关键词数据');
  }

  /**
   * 获取Google搜索结果
   * @param {string} keyword - 目标关键词
   * @param {string} country - 国家/地区代码
   * @returns {Promise<Array>} 搜索结果数组
   */
  static async getGoogleSearchResults(keyword, country) {

    console.log('使用Google API 服务:');
    try {
      const settings = await this.getApiSettings();
      
      if (!settings.googleApiKey || !settings.googleCseId) {
        throw new Error('未设置Google API密钥或CSE ID');
      }
      
      const apiUrl = 'https://www.googleapis.com/customsearch/v1';
      const params = new URLSearchParams({
        key: settings.googleApiKey,
        cx: settings.googleCseId,
        q: keyword,
        gl: country,
        num: 5 // 获取前5个结果
      });
      
      const response = await fetch(`${apiUrl}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Google API请求失败: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        return data.items.map(item => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet || ''
        }));
      }
      
      console.log('google搜索的相关top关键词：', data);

      throw new Error('Google搜索未返回结果');
    } catch (error) {
      console.error('获取Google搜索结果出错:', error);
      // 如果API请求失败，返回模拟数据
      return this.getMockGoogleResults(keyword);
    }
  }

  /**
   * 生成AI内容
   * @param {string} prompt - AI提示
   * @param {string} aiService - AI服务名称
   * @returns {Promise<string>} 生成的内容
   */
  static async generateAIContent(prompt, aiService) {
    try {
      const settings = await this.getApiSettings();
      
      if (!settings.aiApiKey) {
        throw new Error('未设置AI API密钥');
      }
      
      // 使用指定的AI服务，如果未指定则使用设置中的服务
      const service = aiService || settings.aiService || 'deepseek';
      
      console.log('使用AI服务:', service);
      console.log('提示词：', prompt);
      
      // 使用代理请求来避免CORS问题
      switch (service) {
        case 'deepseek':
          return await this.generateDeepseekContent(prompt, settings.aiApiKey);
        case 'qianwen':
          return await this.generateQianwenContent(prompt, settings.aiApiKey);
        case 'volcengine':
          return await this.generateVolcengineContent(prompt, settings.aiApiKey);
        default:
          // 默认使用deepseek
          return await this.generateDeepseekContent(prompt, settings.aiApiKey);
      }
    } catch (error) {
      console.error('生成AI内容出错:', error);
      throw error;
    }
  }

  /**
   * 使用Deepseek生成内容
   * @param {string} prompt - AI提示
   * @param {string} apiKey - API密钥
   * @returns {Promise<string>} 生成的内容
   */
  static async generateDeepseekContent(prompt, apiKey) {
    try {
      console.log('使用Deepseek生成内容');
      
      const apiUrl = 'https://api.deepseek.com/v1/chat/completions';
      const requestBody = {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      };
      const headers = {
        'Authorization': `Bearer ${apiKey}`
      };
      
      console.log('Deepseek请求参数:', {
        url: apiUrl,
        apiKeyLength: apiKey ? apiKey.length : 0,
        promptLength: prompt.length
      });
      
      // 使用代理请求
      const response = await this.fetchWithProxy(
        apiUrl,
        'POST',
        requestBody,
        headers
      );
      
      console.log('Deepseek响应:', response);
      
      if (response.choices && response.choices.length > 0) {
        return response.choices[0].message.content;
      }
      
      throw new Error('Deepseek未返回有效内容');
    } catch (error) {
      console.error('Deepseek API请求失败:', error);
      throw error;
    }
  }

  /**
   * 使用通义千问生成内容
   * @param {string} prompt - AI提示
   * @param {string} apiKey - API密钥
   * @returns {Promise<string>} 生成的内容
   */
  static async generateQianwenContent(prompt, apiKey) {
    const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
    const requestBody = {
      model: 'qwen-max',
      input: {
        prompt: prompt
      },
      parameters: {
        temperature: 0.7,
        max_tokens: 2000
      }
    };
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`通义千问API请求失败: ${response.status} - ${errorData.message || '未知错误'}`);
    }
    
    const data = await response.json();
    
    if (data.output && data.output.text) {
      return data.output.text;
    }
    
    throw new Error('通义千问未返回有效内容');
  }

  /**
   * 使用火山引擎生成内容
   * @param {string} prompt - AI提示
   * @param {string} apiKey - API密钥
   * @returns {Promise<string>} 生成的内容
   */
  static async generateVolcengineContent(prompt, apiKey) {
    const apiUrl = 'https://api.volcengine.com/v1/chat/completions';
    const requestBody = {
      model: 'volcengine-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    };
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`火山引擎API请求失败: ${response.status} - ${errorData.error?.message || '未知错误'}`);
    }
    
    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    }
    
    throw new Error('火山引擎未返回有效内容');
  }

  /**
   * 获取模拟关键词数据
   * @param {string} keyword - 目标关键词
   * @returns {Array} 模拟关键词数据
   */
  static getMockKeywordData(keyword) {
    console.log('使用模拟关键词数据');
    return [
      { keyword: keyword + ' 教程', volume: 1200, competition: 0.65 },
      { keyword: keyword + ' 工具', volume: 880, competition: 0.72 },
      { keyword: keyword + ' 最佳实践', volume: 590, competition: 0.58 },
      { keyword: '如何使用 ' + keyword, volume: 1500, competition: 0.85 },
      { keyword: keyword + ' 入门指南', volume: 950, competition: 0.62 }
    ];
  }

  /**
   * 获取模拟Google搜索结果
   * @param {string} keyword - 目标关键词
   * @returns {Array} 模拟搜索结果
   */
  static getMockGoogleResults(keyword) {
    console.log('使用模拟Google搜索数据');
    return [
      {
        title: keyword + ' - 完整指南 | 示例网站',
        link: 'https://example.com/guide',
        snippet: '这是一个关于' + keyword + '的完整指南，包含了从入门到精通的所有内容...',
      },
      {
        title: keyword + '最佳实践 - 专业博客',
        link: 'https://example.com/blog/best-practices',
        snippet: '了解' + keyword + '的最佳实践和技巧，提升您的专业技能...',
      },
      {
        title: '如何高效使用' + keyword + ' | 教程中心',
        link: 'https://example.com/tutorials',
        snippet: '本教程将教您如何高效使用' + keyword + '，节省时间并提高生产力...',
      },
      {
        title: keyword + '工具比较 - 哪个最适合您？',
        link: 'https://example.com/comparison',
        snippet: '我们比较了市场上最流行的' + keyword + '工具，帮助您选择最适合的一款...',
      },
      {
        title: '初学者的' + keyword + '入门指南',
        link: 'https://example.com/beginners-guide',
        snippet: '这篇入门指南专为' + keyword + '初学者设计，包含基础概念和实用技巧...',
      }
    ];
  }
}

// 简化导出方式，只使用 ES 模块导出
export default ApiService;