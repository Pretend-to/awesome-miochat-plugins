/* eslint-disable camelcase */
import { MioFunction } from '../../lib/functions.js'

export default class CreateNotebook extends MioFunction {
  constructor() {
    super({
      name: 'createNotebook',
      description: 'A tool that creates a Jupyter Notebook (.ipynb) file with specified content.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type:'string',
            description: 'The title of the notebook',
          },
          content: {
            type: 'array',
            description: 'An array of cells, each cell can be a text or code cell',
            items: {
              type: 'object',
              properties: {
                cell_type: {
                  type:'string',
                  description: 'The type of cell (markdown or code)', 
                },
                source: {
                  type:'string',
                  description: 'The content of the cell',
                },
              } 
            } 
          }
        } 
      }
    })
    this.func = this.createNotebook // 指定执行的功能函数
  }

  async createNotebook(e) {
    const { title, content } = e.params
    this.baseUrl = e.user.origin


    // 创建 Jupyter Notebook 文件的内容格式
    const notebookContent = {
      cells: content.map(cell => ({
        cell_type: cell.cell_type,
        source: cell.source,
        metadata: {},
      })),
      metadata: {
        name: title,
      },
      nbformat: 4, // Jupyter Notebook 格式版本
      nbformat_minor: 2,
    }

    // 调用父类的保存文本文件方法
    return this.saveNotebookFile(title, notebookContent)
  }

  async saveNotebookFile(title, content) {
    // 将内容序列化为 JSON 格式
    const jsonContent = JSON.stringify(content, null, 2)
        
    // 指定保存路径
    const fileName = `${title}.ipynb` 
    return this.saveTextFile(this.baseUrl, jsonContent, fileName)
  }
}