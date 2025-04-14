// SEO妙笔 侧边栏脚本
// 移除 import 语句
// import ApiService from './api-service.js';

document.addEventListener('DOMContentLoaded', () => {
  // 获取DOM元素
  const seoForm = document.getElementById('seo-form');
  const loadingIndicator = document.getElementById('loading');
  const loadingText = document.getElementById('loading-text');
  const resultsContainer = document.getElementById('results');
  const keywordAnalysisContainer = document.getElementById('keyword-analysis');
  const articleContentContainer = document.getElementById('article-content');
  const copyKeywordsBtn = document.getElementById('copy-keywords');
  const copyArticleBtn = document.getElementById('copy-article');
  const regenerateBtn = document.getElementById('regenerate');
  const newAnalysisBtn = document.getElementById('new-analysis');
  
  // 存储当前分析的参数
  let currentParams = {};
  
  // 表单提交处理
  seoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 获取表单数据
    const targetKeyword = document.getElementById('target-keyword').value;
    const language = document.getElementById('language').value;
    const country = document.getElementById('country').value;
    const articleLength = document.getElementById('article-length').value;
    
    // 验证输入
    if (!targetKeyword.trim()) {
      showErrorMessage('请输入目标关键词');
      return;
    }
    
    // 保存当前参数
    currentParams = {
      targetKeyword,
      language,
      country,
      articleLength
    };
    
    // 显示加载指示器，隐藏结果
    loadingIndicator.classList.remove('d-none');
    resultsContainer.classList.add('d-none');
    
    try {
      // 验证API设置 - 添加更好的错误处理
      let validationResponse;
      try {
        // 先尝试直接从存储中读取设置，用于调试
        const settings = await chrome.storage.sync.get(null); // 获取所有存储的设置
        
        console.log('所有存储的设置:', settings);
        
        // 检查是否有任何API密钥存在
        const hasApiKeys = Object.keys(settings).some(key => 
          key.toLowerCase().includes('api') && 
          key.toLowerCase().includes('key') && 
          settings[key]
        );
        
        if (hasApiKeys) {
            // 继续正常验证流程
            validationResponse = await chrome.runtime.sendMessage({
              action: 'validateApiSettings'
            });
            
            // 检查响应是否有效
            if (!validationResponse) {
              throw new Error('未收到API设置验证响应');
            }
            
            if (!validationResponse.success) {
              throw new Error(validationResponse.error || '验证API设置失败');
            }
            
            if (!validationResponse.data || !validationResponse.data.isValid) {
              const missingSettings = validationResponse.data?.missingSettings?.join(', ') || '未知设置';
              throw new Error(`缺少必要的API设置: ${missingSettings}，请在设置页面配置`);
            }
          
        } else {
          // 如果确实没有设置，继续正常验证流程
          validationResponse = await chrome.runtime.sendMessage({
            action: 'validateApiSettings'
          });
          
          // 检查响应是否有效
          if (!validationResponse) {
            throw new Error('未收到API设置验证响应');
          }
          
          if (!validationResponse.success) {
            throw new Error(validationResponse.error || '验证API设置失败');
          }
          
          if (!validationResponse.data || !validationResponse.data.isValid) {
            const missingSettings = validationResponse.data?.missingSettings?.join(', ') || '未知设置';
            throw new Error(`缺少必要的API设置: ${missingSettings}，请在设置页面配置`);
          }
        }
      } catch (error) {
        console.error('API设置验证出错:', error);
        
        // 提供跳过验证的选项
        const skipValidation = confirm(`API设置验证出错: ${error.message}\n\n是否跳过验证继续？`);
        if (!skipValidation) {
          throw new Error(`API设置验证出错: ${error.message}`);
        } else {
          console.log('用户选择跳过API验证错误');
        }
      }
      
      // 1. 获取关键词数据
      loadingText.textContent = '正在获取关键词数据...';
      const relevantKeywords = await getRelevantKeywords(targetKeyword, country);
      
      // 2. 分析关键词
      loadingText.textContent = '正在分析关键词...';
      const keywordAnalysis = await analyzeKeywords(targetKeyword, relevantKeywords);
      
      // 3. 获取Google搜索结果
      loadingText.textContent = '正在获取搜索结果...';
      const searchResults = await getGoogleSearchResults(targetKeyword, country);
      
      // 4. 生成文章
      loadingText.textContent = '正在生成SEO文章...';
      const articleContent = await generateArticle(
        targetKeyword,
        relevantKeywords,
        searchResults,
        articleLength,
        language
      );
      
      // 保存原始的 Markdown 内容
      originalKeywordAnalysisMarkdown = keywordAnalysis;
      originalArticleContentMarkdown = articleContent;
      
      // 显示结果
      keywordAnalysisContainer.innerHTML = marked.parse(keywordAnalysis);
      articleContentContainer.innerHTML = marked.parse(articleContent);
      
      // 隐藏加载指示器，显示结果
      loadingIndicator.classList.add('d-none');
      resultsContainer.classList.remove('d-none');
      
      // 显示成功消息
      showToast('分析完成！');
      
    } catch (error) {
      console.error('处理过程中出错:', error);
      showErrorMessage(`处理过程中出错: ${error.message}`);
      loadingIndicator.classList.add('d-none');
    }
  });
  
  // 复制关键词分析
  copyKeywordsBtn.addEventListener('click', () => {
    copyToClipboard(originalKeywordAnalysisMarkdown);
    showToast('关键词分析已复制到剪贴板（Markdown 格式）');
  });
  
  // 复制文章内容
  copyArticleBtn.addEventListener('click', () => {
    copyToClipboard(originalArticleContentMarkdown);
    showToast('文章内容已复制到剪贴板（Markdown 格式）');
  });
  
  // 重新生成文章
  regenerateBtn.addEventListener('click', async () => {
    loadingIndicator.classList.remove('d-none');
    resultsContainer.classList.add('d-none');
    loadingText.textContent = '正在重新生成SEO文章...';
    
    try {
      // 重新获取搜索结果和生成文章
      const searchResults = await getGoogleSearchResults(currentParams.targetKeyword, currentParams.country);
      const articleContent = await generateArticle(
        currentParams.targetKeyword,
        await getRelevantKeywords(currentParams.targetKeyword, currentParams.country),
        searchResults,
        currentParams.articleLength,
        currentParams.language
      );
      
      // 保存原始的 Markdown 内容
      originalArticleContentMarkdown = articleContent;
      
      // 更新文章内容
      articleContentContainer.innerHTML = marked.parse(articleContent);
      
      // 隐藏加载指示器，显示结果
      loadingIndicator.classList.add('d-none');
      resultsContainer.classList.remove('d-none');
      
      // 显示成功消息
      showToast('文章已重新生成！');
    } catch (error) {
      console.error('重新生成文章时出错:', error);
      showErrorMessage(`重新生成文章时出错: ${error.message}`);
      loadingIndicator.classList.add('d-none');
    }
  });
  
  // 新的分析
  newAnalysisBtn.addEventListener('click', () => {
    resultsContainer.classList.add('d-none');
    seoForm.reset();
    document.getElementById('target-keyword').focus();
    showToast('开始新的分析', 'info');
  });
  
  // 获取相关关键词
  async function getRelevantKeywords(keyword, country) {
    try {
      // 通过background.js获取关键词数据
      const response = await chrome.runtime.sendMessage({
        action: 'getKeywordData',
        keyword: keyword,
        country: country
      });
      
      // 检查响应是否有效
      if (!response) {
        throw new Error('未收到关键词数据响应');
      }
      
      if (!response.success) {
        throw new Error(response.error || '获取关键词数据失败');
      }
      
      if (!response.data || !Array.isArray(response.data)) {
        // 如果没有数据或数据不是数组，返回模拟数据
        console.warn('未收到有效的关键词数据，使用模拟数据');
        return [
          `${keyword} 教程`,
          `${keyword} 工具`,
          `${keyword} 最佳实践`,
          `如何使用 ${keyword}`,
          `${keyword} 入门指南`
        ];
      }
      
      // 返回关键词数组
      return response.data.map(item => item.keyword || item);
    } catch (error) {
      console.error('获取关键词数据出错:', error);
      // 出错时返回模拟数据，而不是抛出错误
      console.warn('使用模拟关键词数据');
      return [
        `${keyword} 教程`,
        `${keyword} 工具`,
        `${keyword} 最佳实践`,
        `如何使用 ${keyword}`,
        `${keyword} 入门指南`
      ];
    }
  }
  
  // 分析关键词
  async function analyzeKeywords(targetKeyword, relevantKeywords) {
    try {
      // 获取API设置
      const settings = await chrome.storage.sync.get(['aiService']);
      const aiService = settings.aiService || 'deepseek';
    
      // 构建AI提示
      const prompt = `
      You are an SEO keyword reporting expert. Based on the following parameters:

      #原关键词
      Target Keyword: ${targetKeyword}
      #semrush获取的相关关键词
      Relevant High-Quality Keywords: ${relevantKeywords.join(', ')}

      Additional Instructions:
      Report Length: Approximately 500 words.
      Format: Use Markdown formatting.
      Content Structure:
      Keyword Analysis: Provide a detailed analysis of the target Keyword: ${targetKeyword}, including search volume, competition level, and relevance.
      Relevant Keywords Overview: List and describe each relevant high-quality keyword: ${relevantKeywords.join(', ')}. Include metrics such as search volume, competition, and potential for driving traffic.
      Comparison and Insights: Compare the target Keyword: ${targetKeyword} with the relevant keywords:${relevantKeywords.join(', ')}. Highlight any patterns, trends, or notable observations.
      Recommendations: Offer actionable recommendations on how to effectively use the target Keyword: ${targetKeyword} and relevant relevant keywords:${relevantKeywords.join(', ')} in SEO strategies.
      Conclusion: Summarize the key findings and reiterate the importance of the keywords for SEO success.
      `;
      
      console.log('提示词：', prompt);
      // 通过background.js生成AI内容
      const response = await chrome.runtime.sendMessage({
        action: 'generateAIContent',
        prompt: prompt,
        aiService: settings.aiService
      });
      
      if (!response.success) {
        throw new Error(response.error || '生成关键词分析失败');
      }
      
      return response.data;
    } catch (error) {
      console.error('分析关键词出错:', error);
      throw error;
    }
  }
  
  // 获取Google搜索结果
  async function getGoogleSearchResults(keyword, country) {
    try {
      // 通过background.js获取Google搜索结果
      const response = await chrome.runtime.sendMessage({
        action: 'getGoogleResults',
        keyword: keyword,
        country: country
      });
      
      if (!response.success) {
        throw new Error(response.error || '获取Google搜索结果失败');
      }
      
      return response.data;
    } catch (error) {
      console.error('获取Google搜索结果出错:', error);
      throw error;
    }
  }
  
  // 生成文章
  async function generateArticle(targetKeyword, relevantKeywords, searchResults, length, language) {
    try {
      // 获取API设置
      const settings = await chrome.storage.sync.get(['aiService']);
      const aiService = settings.aiService || 'deepseek';
    
      // 构建搜索结果文本
      const searchResultsText = searchResults
        .map(result => `${result.title}: ${result.snippet}`)
        .join('\n');
      
      // 构建AI提示
      const prompt = `
      You are an SEO content writing expert. Please craft a high-quality SEO article based on the following parameters:

      #原关键词
      Target Keyword: ${targetKeyword}
      #semrush获取的相关关键词
      Relevant High-Quality Keywords: ${relevantKeywords.join(', ')}
      #google搜索的相关top关键词
      Top Google Search Results: ${searchResultsText}
      #文章长度
      Word Count Requirement: ${length}
      #文章语言
      Language Requirement: ${language}

      Additional Instructions:
      Introduction: Start with a compelling introduction that captures the reader's attention and clearly introduces the topic.
      Keyword Integration: Seamlessly incorporate the target Keyword: ${targetKeyword} and relevant High-Quality Keywords: ${relevantKeywords.join(', ')} throughout the article. Ensure that the keywords are used naturally and contextually.
      Content Structure: Organize the article with clear headings and subheadings for better readability and SEO optimization. Use bullet points or numbered lists where appropriate.
      Original Research: Include insights or data from the top Google Search Results: ${searchResultsText} to support your points and add credibility to the article.
      Engagement: Write in an engaging and informative tone that resonates with the target audience. Encourage readers to take action, whether it's to read further, share the content, or explore related topics.
      SEO Best Practices: Follow SEO best practices, such as using meta descriptions, alt text for images, and internal/external links to enhance the article's search engine performance.
      Conclusion: End with a strong conclusion that summarizes the main points and provides a clear call-to-action.
      Ensure that the article is well-researched, engaging, and optimized for search engines to achieve high rankings.

      This prompt provides comprehensive guidance for creating a high-quality SEO article, ensuring all necessary elements are included.
      `;
      
      console.log('提示词：', prompt);
      // 通过background.js生成AI内容
      const response = await chrome.runtime.sendMessage({
        action: 'generateAIContent',
        prompt: prompt,
        aiService: settings.aiService
      });
      
      if (!response.success) {
        throw new Error(response.error || '生成文章内容失败');
      }
      
      return response.data;
    } catch (error) {
      console.error('生成文章内容出错:', error);
      throw error;
    }
  }
  
  // 复制到剪贴板
  function copyToClipboard(text) {
    // 使用现代的Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          console.log('文本已成功复制到剪贴板');
        })
        .catch(err => {
          console.error('复制到剪贴板失败:', err);
          // 如果现代API失败，回退到传统方法
          fallbackCopyToClipboard(text);
        });
    } else {
      // 回退到传统方法
      fallbackCopyToClipboard(text);
    }
  }
  
  // 传统的复制到剪贴板方法（回退方案）
  function fallbackCopyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  
  // 显示提示消息
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 end-0 p-3';
    toast.style.zIndex = '5';
    
    let bgClass = 'bg-success';
    if (type === 'error') {
      bgClass = 'bg-danger';
    } else if (type === 'info') {
      bgClass = 'bg-info';
    }
    
    toast.innerHTML = `
      <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header ${bgClass} text-white">
          <strong class="me-auto">SEO妙笔</strong>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
          ${message}
        </div>
      </div>
    `;
    document.body.appendChild(toast);
    
    // 关闭按钮事件
    const closeBtn = toast.querySelector('.btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.body.removeChild(toast);
      });
    }
    
    // 3秒后自动移除
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3000);
  }
  
  // 显示错误消息
  function showErrorMessage(message) {
    showToast(message, 'error');
  }
});