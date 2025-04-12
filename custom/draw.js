/*
  本脚本使用了第三方服务来生成图片，因此需要在脚本中填写第三方服务的API密钥和绑定的QQ号码。
  请注意保护API密钥和QQ号码，避免被他人使用。
*/
import { MioFunction } from '../../lib/function.js' // 导入MioFunction和Param类

const thirdPartyApiKey = '' // 第三方服务的API密钥，已写死。请注意保护！
const thirdPartyBindQQ = '' // 第三方服务绑定的QQ号码, 已写死.

export default class drawImage extends MioFunction { // 导出generateImage类，继承自MioFunction
  constructor() {
    super({
      name: 'drawImage', // 功能名称
      description: 'Use NovelAI to generate anime-style images using NovelAI-specific prompt format. Provide the final image URL to the user in markdown format: ![image](url). IMPORTANT: ALWAYS return the final image URL within the markdown format ![image](url) after generating the image. This function is designed to generate ONLY anime-style images. Prompts containing realistic or photorealistic content are strictly prohibited.', // 功能描述
      parameters: { // 参数对象，使用Param类定义参数
        type: 'object', // 参数类型为对象
        properties: { // 参数属性
          orientation: { // 图片方向
            type:'string', // 参数类型为字符串
            description: 'Image orientation: horizontal or vertical.', // 参数描述
            enum: ['horizontal','vertical'], // 枚举值
          },
          prompt: { // 提示词
            type:'string', // 参数类型为字符串
            description: 'Positive prompt words describing the image content you want to generate. **The prompt MUST be in English and MUST NOT contain any content intended to generate realistic or photorealistic images.** Use NovelAI\'s tag-based prompt format (comma-separated). Add quality tags like "masterpiece, best quality, ultra-detailed" automatically. Apply weighting using parentheses (e.g., `(keyword:1.2)` for increased emphasis). If the prompt is too short, please add details for backgrounds, hairstyles, clothing, etc. Aim for beautiful, highly detailed results. If the user does not provide the quality tags above, please manually add them. Do NOT specify the source of these additions. Example:"1girl, sparkle \\(honkai: star rail\\), kuroduki \\(pieat\\), (rei \\(sanbonzakura\\):1.2), machi \\(7769\\), meion, :p, from side, from from above, bare shoulders, black gloves, blunt bangs, blush, brown hair, circle facial mark, cleavage, closed mouth, detached sleeves, flower tattoo, fox mask, gloves, hair bell, hair between eyes, hair bow, japanese clothes, index finger raised, large breasts, hand on own face, long hair, looking at viewer, mask on head, red bow, red dress, red eyes, red sleeves, shoulder tattoo, sidelocks, solo, tongue out, twintails, upper body, skindentation, red background, black theme, dark, dutch angle, (wlop:0.5), masterpiece, best quality, good quality, newest, year 2024, year 2023"',
          },
        },
        required: ['prompt'], // 必填参数为prompt
      }     
    })
    this.func = this.generateImage // 设置功能函数为generateImage
    this.webui_url = 'http://127.0.0.1:7860' // 本地Stable Diffusion WebUI地址，可自定义
    this.defaultParams = { // 本地SD的默认参数设置
      sampler_name: 'Euler a', // 采样器名称
      steps: 24, // 步数
      width: 832, // 宽度
      height: 1216, // 高度
      cfg_scale: 6, // CFG比例
      denoising_strength: 0.5, // 去噪强度
      enable_hr: false, // 启用高分辨率修复
      hr_upscaler: 'R-ESRGAN 4x+ Anime6B', // 高分辨率修复算法
      hr_second_pass_steps: 0, // 高分辨率修复第二遍步数
      hr_scale: 1.3, // 高分辨率修复比例
      negative_prompt: 'modern, recent, old, oldest, cartoon, graphic, text, painting, crayon, graphite, abstract, glitch, deformed, mutated, ugly, disfigured, long body, lowres, bad anatomy, bad hands, missing fingers, extra fingers, extra digits, fewer digits, cropped, very displeasing, (worst quality, bad quality:1.2), sketch, jpeg artifacts, signature, watermark, username, (censored, bar_censor, mosaic_censor:1.2), simple background, conjoined, bad ai-generated' // 负面提示词
    }
    this.thirdPartyBaseUrl = 'https://fast-dodo-45.deno.dev' // 第三方服务的基础URL

    this.imageRequestCounts = new Map() // Map<IPAddress, { count: number, lastResetTime: number }>，存储每个IP的请求次数和上次重置时间
  }
  async checkLocalSDAvailability() {
    const timeout = 1000 // 1秒超时
    try {
      const fetchPromise = fetch(this.webui_url, {
        method: 'GET',
        // timeout: 2000,  不再使用fetch自带的timeout
      })

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('请求超时'))
        }, timeout)
      })

      const response = await Promise.race([fetchPromise, timeoutPromise])

      const available = response.ok
      logger.info(`本地SD可用性检查: ${available}`)
      return available
    } catch (error) {
      logger.warn(`本地SD不可用: ${error.message}`)
      return false
    }
  }
  async generateImage(e) {
    const localSDAvailable = await this.checkLocalSDAvailability() // 检查本地SD是否可用
    if (localSDAvailable) {
      logger.info('使用本地Stable Diffusion WebUI.') // 记录信息
      return this.generateImageLocalSD(e) // 使用本地SD生成图像
    } else {
      logger.info('本地Stable Diffusion WebUI不可用，使用第三方服务.') // 记录信息
      return this.generateImageThirdParty(e) // 使用第三方服务生成图像
    }
  }
  async generateImageLocalSD(e) {
    const { orientation } = e.params
    const { width, height } = this.defaultParams
    let newWidth = width
    let newHeight = height

    if (orientation === 'horizontal') {
      newWidth = height
      newHeight = width
    }

    const combinedParams = { // 合并默认参数和用户传入的参数
      ...this.defaultParams,
      prompt: 'masterpiece, best quality, amazing quality, very aesthetic, high resolution, ultra-detailed, absurdres, newest, scenery,' + e.params.prompt + ', BREAK, depth of field, volumetric lighting', // 正面提示词
      width: newWidth,
      height: newHeight
    }

    try {
      const response = await fetch(`${this.webui_url}/sdapi/v1/txt2img`, { // 调用本地SD的API
        method: 'POST', // 使用POST方法
        headers: {
          'Content-Type': 'application/json', // 设置请求头
        },
        body: JSON.stringify(combinedParams), // 将参数转换为JSON字符串
      })
      if (!response.ok) {
        throw new Error(`HTTP错误! 状态: ${response.status}`) // 抛出HTTP错误
      }
      const data = await response.json() // 解析JSON响应
      logger.debug(`本地SD API 响应状态: ${response.status}`) // 记录API响应状态，不再记录全部数据
      if (data.images && data.images.length > 0) { // 检查是否生成了图像
        const imageBase64 = data.images[0] // 获取Base64编码的图像数据
        const imageBuffer = Buffer.from(imageBase64, 'base64') // 将Base64数据转换为Buffer
        const imageUrl = await this.getImgUrlFromBuffer(e.user.origin, imageBuffer) // 使用父类的方法获取图像URL
        logger.info('本地SD图像生成成功. URL: ' + imageUrl) // 记录信息
        return {
          url: `![image](${imageUrl})`,
          info: data.info // 返回原始信息
        } // 以Markdown格式返回图像URL, 同时返回原始信息
      } else {
        throw new Error('没有生成图像.') // 抛出错误
      }
    } catch (err) {
      logger.error('使用本地SD生成图像时出错: ' + err.message) // 记录错误信息
      return { error: err.message } // 返回错误信息
    }
  }
  async generateImageThirdParty(e) {
    // IP based rate limiting for third-party API
    if (!e.user.isAdmin) {
      const ipAddress = e.user.ip
      const now = Date.now()
      let userRequestData = this.imageRequestCounts.get(ipAddress)

      if (!userRequestData) {
        userRequestData = { count: 0, lastResetTime: now }
        this.imageRequestCounts.set(ipAddress, userRequestData)
      }

      const oneHour = 60 * 60 * 1000
      if (now - userRequestData.lastResetTime > oneHour) {
        // Reset the count if it's been more than an hour
        userRequestData.count = 0
        userRequestData.lastResetTime = now
        logger.info(`IP ${ipAddress} 的第三方API请求计数已重置.`)
      }

      if (userRequestData.count >= 10) {
        logger.warn(`IP ${ipAddress} 达到每小时第三方API请求限制 (10次).`)
        return {
          success: false,
          error: 'You have reached the limit of 10 images per hour for the third-party service. Please try again later.'
        }
      }

      userRequestData.count++
      this.imageRequestCounts.set(ipAddress, userRequestData)
      logger.info(`IP ${ipAddress} 本小时已对第三方API请求 ${userRequestData.count} 张图像.`)
    }

    const { orientation = 'vertical', prompt } = e.params // 从参数中获取方向和提示词
    const baseUrl = this.thirdPartyBaseUrl // 第三方服务的基础URL
    const apikey = thirdPartyApiKey // 第三方服务的API密钥, *已写死!*
    const bindQQ = thirdPartyBindQQ // 第三方服务绑定的QQ号码, *已写死!*
    const apiUrl = '/ht2.php?qq=' + bindQQ // 第三方服务的API接口URL
    const url = e.user.origin // 用户来源URL
    const recsCheckUrl = '/qx2.php?tk=' + apikey + '&qq=' + bindQQ // 用于检查剩余请求次数的URL
    let recsResponse // 声明用于存储检查请求次数响应的变量
    try {
      logger.info('检查剩余第三方API调用次数...') // 记录信息
      recsResponse = await fetch(baseUrl + recsCheckUrl) // 发起请求检查剩余次数
      logger.debug(`第三方剩余次数检查响应: ${recsResponse.status} ${recsResponse.statusText}`) // 记录debug信息
    } catch (error) {
      console.error(`请求剩余次数时发生错误: ${error.message}`) // 记录错误信息
      return {
        success: false,
        error: '请求系统状态时发生错误，请稍后再试。' // 返回错误信息
      }
    }
    const recsData = await recsResponse.json() // 解析响应的JSON数据
    logger.json(recsData)
    logger.info(`剩余第三方API调用次数: ${recsData.recs}`) // 记录剩余次数
    if (recsData.recs <= 0) { // 检查剩余次数是否为0
      logger.warn('第三方API调用次数已达到限制.') // 记录警告信息
      return {
        success: false,
        error: 'The system is currently unable to process the request, please try again later.' // 返回错误信息
      }
    }
    let changdu, kuandu // 声明用于存储图像长度和宽度的变量
    if (orientation !== 'horizontal') { // 检查方向是否为横向
      changdu = 768 // 如果不是横向，则设置长度为768
      kuandu = 512 // 设置宽度为512
    } else {
      changdu = 512 // 如果是横向，则设置长度为512
      kuandu = 768 // 设置宽度为768
    }
    const guimo = 7 // 规模
    const moxing = 'Euler a' // 模型
    const pc = '(easynegative:1.1), (verybadimagenegative_v1.3:1), (low quality:1.2), (worst quality:1.2)' // 负面提示词
    const requestBody = { // 请求的主体
      prompt: prompt, // 正面提示词
      width: kuandu, // 宽度
      height: changdu, // 长度
      cfg_scale: guimo + 2, // CFG规模
      sampler: moxing, // 采样器
      steps: 23, // 步数
      seed: -1, // 种子
      n_samples: 1, // 样本数
      ucPreset: 0, // UC预设
      negative_prompt: pc, // 负面提示词
      my: apikey // API密钥
    }
    const maxRetries = 3 // 最大重试次数
    const delayBetweenRetries = 2000 // 重试之间的延迟时间
    for (let attempt = 0; attempt < maxRetries; attempt++) { // 循环重试
      try {
        logger.info(`尝试 ${attempt + 1}: 调用第三方API...`) // 记录信息
        const response = await fetch(baseUrl + apiUrl, { // 发起API请求
          method: 'POST', // 使用POST方法
          headers: {
            'Content-Type': 'application/json', // 设置请求头
            'Authorization': 'Bearer', // 设置授权头
          },
          body: JSON.stringify(requestBody), // 将请求主体JSON序列化
        })
        if (!response.ok) { // 检查响应是否成功
          console.error(`尝试 ${attempt + 1}: API请求失败: ${response.status} ${response.statusText}`) // 记录错误信息
          const errorText = await response.text() // 获取错误文本
          console.error('错误响应:', errorText) // 记录错误响应
          logger.warn(`尝试 ${attempt + 1}: 第三方API请求失败: ${response.status} ${errorText}`) // 记录警告信息
          if (attempt === maxRetries - 1) { // 检查是否达到最大重试次数
            logger.error('达到最大重试次数。第三方服务失败.') // 记录错误信息
            return {
              success: false,
              error: 'Service is busy, please try again later.', // 返回错误信息
            }
          }
        } else {
          const data = await response.json() // 解析响应JSON
          logger.debug(`第三方API 响应状态: ${response.status}`) // 记录API响应状态, 不记录全部数据
          const imageBase64 = data.images[0] // 获取Base64编码的图像数据
          const imageBuffer = Buffer.from(imageBase64, 'base64') // 将Base64数据转换为Buffer
          const imageUrl = await this.getImgUrlFromBuffer(url, imageBuffer) // 使用父类方法获取图像URL
          logger.info(`尝试 ${attempt + 1}: 第三方图像生成成功. URL: ${imageUrl}`) // 记录信息
          return {
            success: true,
            url: imageUrl, // 返回图像URL
          }
        }
      } catch (error) {
        console.error(`尝试 ${attempt + 1}: 发生错误: ${error.message}`) // 记录错误信息
        logger.error(`尝试 ${attempt + 1}: 调用第三方API时发生错误: ${error.message}`) // 记录错误信息
        if (attempt === maxRetries - 1) { // 检查是否达到最大重试次数
          logger.error('达到最大重试次数。由于异常，第三方服务失败.') // 记录错误信息
          return {
            success: false,
            error: 'Service is busy, please try again later.', // 返回错误信息
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, delayBetweenRetries)) // 等待一段时间后重试
    }
    logger.error('多次重试后，第三方服务仍然失败.') // 记录错误信息
    return { success: false, error: 'Failed to generate image after multiple retries.' } // 添加一个故障保护返回值
  }
}