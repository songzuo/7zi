/**
 * OpenClaw Workflow Engine v1.11.0
 * Version Control API Routes
 */

import { Router, Request, Response } from 'express';
import { VersionControlService } from './VersionControlService';
import { ILogger } from '../logging/Logger';
import { RedisStorage } from '../storage/RedisStorage';

/**
 * 版本控制 API 路由
 */
export class VersionControlRoutes {
  private router: Router;
  private versionService: VersionControlService;
  private storage: RedisStorage;
  private logger: ILogger;

  constructor(
    storage: RedisStorage,
    logger: ILogger
  ) {
    this.storage = storage;
    this.logger = logger;
    this.versionService = new VersionControlService(storage, logger);
    this.router = Router();
    this.setupRoutes();
  }

  /**
   * 设置路由
   */
  private setupRoutes(): void {
    // 版本管理
    this.router.post('/workflows/:id/versions', this.createVersion.bind(this));
    this.router.get('/workflows/:id/versions', this.getVersions.bind(this));
    this.router.get('/workflows/:id/versions/:versionId', this.getVersion.bind(this));
    this.router.post('/workflows/:id/rollback', this.rollback.bind(this));
    this.router.get('/workflows/:id/versions/diff', this.diffVersions.bind(this));
    
    // 分支管理
    this.router.post('/workflows/:id/branches', this.createBranch.bind(this));
    this.router.get('/workflows/:id/branches', this.getBranches.bind(this));
    this.router.get('/workflows/:id/branches/:branchName', this.getBranchHead.bind(this));
    this.router.delete('/workflows/:id/branches/:branchName', this.deleteBranch.bind(this));
    
    // 标签管理
    this.router.post('/workflows/:id/tags', this.createTag.bind(this));
    this.router.get('/workflows/:id/tags', this.getTags.bind(this));
    this.router.get('/workflows/:id/tags/:tagName', this.getVersionByTag.bind(this));
    this.router.delete('/workflows/:id/tags/:tagName', this.deleteTag.bind(this));
    
    // 时间线
    this.router.get('/workflows/:id/timeline', this.getTimeline.bind(this));
    this.router.get('/workflows/:id/history/:versionId', this.getVersionHistory.bind(this));
  }

  // ============================================================================
  // Version Management
  // ============================================================================

  /**
   * 创建新版本
   * POST /api/workflows/:id/versions
   */
  private async createVersion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { changeSummary, parentVersionId, branch, createdBy } = req.body;
      
      // 获取当前工作流
      const workflow = await this.storage.getWorkflow(id);
      
      if (!workflow) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Workflow not found',
            code: 'NOT_FOUND'
          }
        });
        return;
      }
      
      const version = await this.versionService.createVersion(
        workflow,
        changeSummary || 'Manual version creation',
        createdBy,
        parentVersionId,
        branch
      );
      
      res.status(201).json({
        success: true,
        data: version
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * 获取版本列表
   * GET /api/workflows/:id/versions
   */
  private async getVersions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { branch, tag, limit, offset, sortBy, sortOrder } = req.query;
      
      // 如果指定了标签，通过标签获取版本
      if (tag) {
        const version = await this.versionService.getVersionByTag(id, tag as string);
        
        if (!version) {
          res.status(404).json({
            success: false,
            error: {
              message: `Tag "${tag}" not found`,
              code: 'NOT_FOUND'
            }
          });
          return;
        }
        
        res.json({
          success: true,
          data: [version],
          total: 1
        });
        return;
      }
      
      const versions = await this.versionService.getVersions(id, {
        branch: branch as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        sortBy: sortBy as 'createdAt' | 'version',
        sortOrder: sortOrder as 'asc' | 'desc'
      });
      
      const total = await this.versionService.getVersionCount(id);
      
      res.json({
        success: true,
        data: versions,
        total
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * 获取版本详情
   * GET /api/workflows/:id/versions/:versionId
   */
  private async getVersion(req: Request, res: Response): Promise<void> {
    try {
      const { versionId } = req.params;
      
      const version = await this.versionService.getVersion(versionId);
      
      if (!version) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Version not found',
            code: 'NOT_FOUND'
          }
        });
        return;
      }
      
      res.json({
        success: true,
        data: version
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * 回滚到指定版本
   * POST /api/workflows/:id/rollback
   */
  private async rollback(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { versionId, createNewVersion, changeSummary, createdBy } = req.body;
      
      if (!versionId) {
        res.status(400).json({
          success: false,
          error: {
            message: 'versionId is required',
            code: 'BAD_REQUEST'
          }
        });
        return;
      }
      
      const result = await this.versionService.rollback(
        id,
        {
          versionId,
          createNewVersion,
          changeSummary
        },
        createdBy
      );
      
      if (result.success) {
        res.json({
          success: true,
          data: result
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            message: result.message,
            code: 'ROLLBACK_FAILED'
          }
        });
      }
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * 对比两个版本
   * GET /api/workflows/:id/versions/diff
   */
  private async diffVersions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { versionId1, versionId2, includeDetails } = req.query;
      
      if (!versionId1 || !versionId2) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Both versionId1 and versionId2 are required',
            code: 'BAD_REQUEST'
          }
        });
        return;
      }
      
      const diff = await this.versionService.diffVersions({
        versionId1: versionId1 as string,
        versionId2: versionId2 as string,
        includeDetails: includeDetails === 'true'
      });
      
      res.json({
        success: true,
        data: diff
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // ============================================================================
  // Branch Management
  // ============================================================================

  /**
   * 创建分支
   * POST /api/workflows/:id/branches
   */
  private async createBranch(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, fromVersionId, createdBy, description } = req.body;
      
      if (!name || !fromVersionId) {
        res.status(400).json({
          success: false,
          error: {
            message: 'name and fromVersionId are required',
            code: 'BAD_REQUEST'
          }
        });
        return;
      }
      
      const branch = await this.versionService.createBranch(
        id,
        name,
        fromVersionId,
        createdBy
      );
      
      res.status(201).json({
        success: true,
        data: branch
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * 获取分支列表
   * GET /api/workflows/:id/branches
   */
  private async getBranches(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const branches = await this.versionService.getBranches(id);
      
      res.json({
        success: true,
        data: branches,
        total: branches.length
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * 获取分支头版本
   * GET /api/workflows/:id/branches/:branchName
   */
  private async getBranchHead(req: Request, res: Response): Promise<void> {
    try {
      const { id, branchName } = req.params;
      
      const version = await this.versionService.getBranchHead(id, branchName);
      
      if (!version) {
        res.status(404).json({
          success: false,
          error: {
            message: `Branch "${branchName}" not found`,
            code: 'NOT_FOUND'
          }
        });
        return;
      }
      
      res.json({
        success: true,
        data: version
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * 删除分支
   * DELETE /api/workflows/:id/branches/:branchName
   */
  private async deleteBranch(req: Request, res: Response): Promise<void> {
    try {
      const { id, branchName } = req.params;
      
      const deleted = await this.versionService.deleteBranch(id, branchName);
      
      if (deleted) {
        res.json({
          success: true,
          message: `Branch "${branchName}" deleted successfully`
        });
      } else {
        res.status(404).json({
          success: false,
          error: {
            message: `Branch "${branchName}" not found`,
            code: 'NOT_FOUND'
          }
        });
      }
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // ============================================================================
  // Tag Management
  // ============================================================================

  /**
   * 创建标签
   * POST /api/workflows/:id/tags
   */
  private async createTag(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, versionId, createdBy, description } = req.body;
      
      if (!name || !versionId) {
        res.status(400).json({
          success: false,
          error: {
            message: 'name and versionId are required',
            code: 'BAD_REQUEST'
          }
        });
        return;
      }
      
      const tag = await this.versionService.createTag(
        id,
        versionId,
        name,
        createdBy,
        description
      );
      
      res.status(201).json({
        success: true,
        data: tag
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * 获取标签列表
   * GET /api/workflows/:id/tags
   */
  private async getTags(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const tags = await this.versionService.getTags(id);
      
      res.json({
        success: true,
        data: tags,
        total: tags.length
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * 通过标签获取版本
   * GET /api/workflows/:id/tags/:tagName
   */
  private async getVersionByTag(req: Request, res: Response): Promise<void> {
    try {
      const { id, tagName } = req.params;
      
      const version = await this.versionService.getVersionByTag(id, tagName);
      
      if (!version) {
        res.status(404).json({
          success: false,
          error: {
            message: `Tag "${tagName}" not found`,
            code: 'NOT_FOUND'
          }
        });
        return;
      }
      
      res.json({
        success: true,
        data: version
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * 删除标签
   * DELETE /api/workflows/:id/tags/:tagName
   */
  private async deleteTag(req: Request, res: Response): Promise<void> {
    try {
      const { id, tagName } = req.params;
      
      const deleted = await this.versionService.deleteTag(id, tagName);
      
      if (deleted) {
        res.json({
          success: true,
          message: `Tag "${tagName}" deleted successfully`
        });
      } else {
        res.status(404).json({
          success: false,
          error: {
            message: `Tag "${tagName}" not found`,
            code: 'NOT_FOUND'
          }
        });
      }
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // ============================================================================
  // Timeline & History
  // ============================================================================

  /**
   * 获取时间线
   * GET /api/workflows/:id/timeline
   */
  private async getTimeline(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const timeline = await this.versionService.getVersionTimeline(id);
      
      res.json({
        success: true,
        data: timeline
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * 获取版本历史
   * GET /api/workflows/:id/history/:versionId
   */
  private async getVersionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id, versionId } = req.params;
      
      const history = await this.versionService.getVersionHistory(id, versionId);
      
      res.json({
        success: true,
        data: history,
        total: history.length
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // ============================================================================
  // Error Handler
  // ============================================================================

  private handleError(res: Response, error: any): void {
    const message = error instanceof Error ? error.message : String(error);
    const code = error.code || 'INTERNAL_ERROR';

    this.logger.error('Version API Error', { error: message, code });

    res.status(error.status || 500).json({
      success: false,
      error: {
        message,
        code
      }
    });
  }

  /**
   * 获取路由器
   */
  getRouter(): Router {
    return this.router;
  }
}
