import { MioFunction } from '../../lib/functions.js'
import path from 'path'
import fetch from 'node-fetch' // Import fetch for Node.js
import FormData from 'form-data'

const config = {
    glm_key: '', 
    llama_key: '', 
}

export default class parseFile extends MioFunction {
    constructor() {
        super({
            name: 'parseFile',
            description: 'A tool to upload a file for content extraction and retrieve the extracted content, then delete the uploaded file.',
            parameters: {
                type: 'object',
                properties: {
                    file_urls: {
                        type: 'array',
                        description: 'The URLs of the files to parse for content extraction.',
                        items: {
                            type: 'string',
                        },
                    },
                    high_quality: { // 新增参数，用于控制是否使用高质量解析
                        type: 'boolean',
                        description: 'Whether to use high-quality parsing. Default is false.',
                    }
                },
            },
            required: ['file_urls']
        })
        this.func = this.parseFile
    }

    async parseFile(e) {
        const { glm_key, llama_key } = config; // Use the config object for API keys
    
        // Check if API keys are present
        if (!glm_key && !llama_key) {
            return {
                error: 'API keys are missing. Please check your configuration.'
            };
        }
    
        let availableParser;
        if (glm_key && llama_key) {
            // Both keys are available, randomly choose one
            availableParser = Math.random() < 0.5 ? 'glmPaser' : 'llamaPaser'; 
        } else if (glm_key) {
            // Only GLM key is available
            availableParser = 'glmPaser';
        } else {
            // Only Llama key is available
            availableParser = 'llamaPaser';
        }
    
        // Call the appropriate parser function
        if (availableParser === 'glmPaser') {
            return await this.glmPaser(e); // Call the GLM parser function if available
        } else {
            return await this.llamaPaser(e); // Call the Llama parser function if available
        }
    }

    async glmPaser(e) {
        const fileUrls = e.params.file_urls
        const apiKey = config.glm_key // Use the API key from the config object

        const results = []

        for (const fileUrl of fileUrls) {
            let fileId = null // Store fileId for deletion
            let fileName

            try {
                // Fetch the file from the URL
                const fileResponse = await fetch(fileUrl)
                if (!fileResponse.ok) {
                    results.push({
                        fileUrl: fileUrl,
                        error: `Failed to fetch file from URL: ${fileResponse.status} ${fileResponse.statusText}`
                    })
                    continue
                }
                const arrayBuffer = await fileResponse.arrayBuffer()
                const buffer = Buffer.from(arrayBuffer)

                // Extract filename (more robust)
                try {
                    const urlParts = new URL(fileUrl) // Using URL constructor for safety
                    const pathname = urlParts.pathname
                    fileName = pathname.substring(pathname.lastIndexOf('/') + 1)
                } catch (error) {
                    fileName = 'unknown_file' // Fallback if URL parsing fails
                    console.warn('Failed to parse URL to extract filename:', error)
                }
                // Upload the file
                const formData = new FormData()
                formData.append('file', buffer, fileName)
                formData.append('purpose', 'file-extract') // Hardcoded for file extraction

                let uploadResponse, uploadData

                try {
                    uploadResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/files', {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            ...formData.getHeaders(),
                        },
                    })
                    uploadData = await uploadResponse.json()  // Try parsing as JSON

                    console.log('Upload response status:', uploadResponse.status) // Debugging.  Look at the RESPONSE STATUS
                    console.log('Upload response headers:', uploadResponse.headers) // Look at headers

                    if (uploadResponse.status !== 200) { // Modified check
                        console.error('Upload failed:', uploadData)  // See error message
                        throw new Error(`Upload failed with status ${uploadResponse.status}: ${uploadData.msg || uploadResponse.statusText}`)
                    }


                    fileId = uploadData.id  // Correctly access file id // Store the file ID
                    console.log(`Uploaded fileId: ${fileId}`)
                } catch (uploadError) {
                    console.error('Upload error:', uploadError)
                    results.push({
                        fileUrl: fileUrl,
                        error: `Upload request failed. ${uploadError.message}`
                    })
                    continue
                }

                console.log('Upload successful:', uploadData)

                // Retrieve the content
                let contentResponse
                try {
                    contentResponse = await fetch(`https://open.bigmodel.cn/api/paas/v4/files/${fileId}/content`, {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                        },
                    })
                } catch (contentError) {
                    results.push({
                        fileUrl: fileUrl,
                        error: `Content request failed: ${contentError.message}`,
                    })
                    continue
                }

                if (!contentResponse.ok) {
                    const errorText = await contentResponse.text()
                    results.push({
                        fileUrl: fileUrl,
                        error: `Failed to retrieve content: ${contentResponse.status} ${contentResponse.statusText} - ${errorText}`,
                    })
                    continue
                }

                const contentData = await contentResponse.json() // Expect JSON, may need to adjust based on API
                results.push({
                    fileUrl: fileUrl,
                    uploadData: uploadData, // Include uploadData for debugging
                    content: contentData,
                })
            } catch (error) {
                console.error('General error:', error)
                results.push({
                    fileUrl: fileUrl,
                    error: `An error occurred: ${error.message}`,
                })
            } finally {
                // Delete the file, even if there was an error.
                if (fileId) {
                    try {
                        const deleteResponse = await fetch(`https://open.bigmodel.cn/api/paas/v4/files/${fileId}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                            },
                        })

                        if (!deleteResponse.ok) {
                            const errorText = await deleteResponse.text()
                            results.push({
                                fileUrl: fileUrl,
                                fileId: fileId,
                                deletionError: `Failed to delete file: ${deleteResponse.status} ${deleteResponse.statusText} - ${errorText}`,
                            })
                        } else {
                            results.push({
                                fileUrl: fileUrl,
                                fileId: fileId,
                                deleted: true,
                            })
                        }
                    } catch (deleteError) {
                        results.push({
                            fileUrl: fileUrl,
                            fileId: fileId,
                            deletionError: `Deletion request failed: ${deleteError.message}`,
                        })
                    }
                }
            }
        }

        return results
    }

    async llamaPaser(e) {
        const baseUrl = 'https://api.cloud.llamaindex.ai/api/v1/parsing'
        const uploadPath = '/upload'
        const statusPath = '/job/:job_id'
        const resultPath = `/job/:job_id/result/text`

        const apiKey = config.llama_key // Use the API key from the config object
        const fastMode = e.params.high_quality ? false : true // Use the high_quality parameter to determine fast_mode
        const fileUrls = e.params.file_urls; // Use the file URLs from the parameters

        // 建立结果数组
        const results = [];

        for (const fileUrl of fileUrls) {
            const fileResponse = await fetch(fileUrl);
            if (!fileResponse.ok) {
                throw new Error(`下载文件失败: ${fileResponse.status} ${fileResponse.statusText}`);
            }
        
            const fileBuffer = await fileResponse.arrayBuffer();
            const file = Buffer.from(fileBuffer);  // 确保是 Buffer
        
            const url = new URL(fileUrl);
            const filename = path.basename(url.pathname);
        
            const formData = new FormData();
            formData.append('fast_mode', String(fastMode)); // 将 fastMode 转换为字符串
            formData.append('file', file, String(filename));
        
            const uploadResponse = await fetch(`${baseUrl}${uploadPath}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: formData,
            });

            if (!uploadResponse.ok) {
                console.error('上传失败:', uploadResponse.status, uploadResponse.statusText)
                results.push({
                    fileUrl: fileUrl,
                    error: `上传失败: ${uploadResponse.status} ${uploadResponse.statusText}`
                })
                continue // 跳过当前文件，继续处理下一个文件
            }

            const uploadData = await uploadResponse.json() // 解析上传响应为 JSON
            const jobId = uploadData.id // 获取 job_id

            // 等待解析完成
            let statusResponse, statusData;
            do {
                await new Promise(resolve => setTimeout(resolve, 500)) // 等待 .5 秒
                statusResponse = await fetch(`${baseUrl}${statusPath.replace(':job_id', jobId)}`, { // 使用 job_id 替换路径中的 :job_id
                    headers: {
                        'Authorization': `Bearer ${apiKey}`, // 使用 API 密钥进行身份验证
                    },
                }) 
                statusData = await statusResponse.json() // 解析状态响应为 JSON

            } while (statusData.status === 'PENDING') // 循环状态为 PENDING

            // 获取解析结果
            const resultResponse = await fetch(`${baseUrl}${resultPath.replace(':job_id', jobId)}`, { // 使用 job_id 替换路径中的 :job_id
                headers: {
                    'Authorization': `Bearer ${apiKey}`, // 使用 API 密钥进行身份验证
                },
            })

            if (!resultResponse.ok) {
                console.error('获取结果失败:', resultResponse.status, resultResponse.statusText)
                results.push({
                    fileUrl: fileUrl,
                    error: `获取结果失败: ${resultResponse.status} ${resultResponse.statusText}`
                })
                continue // 跳过当前文件，继续处理下一个文件
            }

            const { text } = await resultResponse.json() // 解析结果响应为 JSON
            results.push({
                fileUrl: fileUrl, // 保存文件 URL
                result: text, // 保存解析结果
            })
        }

        return results // 返回所有文件的解析结果
    }
}