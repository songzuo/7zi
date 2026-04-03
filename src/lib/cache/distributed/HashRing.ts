/**
 * Consistent Hash Ring for Distributed Cache
 * 
 * Implements consistent hashing with virtual nodes for even distribution.
 * 
 * @module lib/cache/distributed/HashRing
 */

import type { CacheNode, HashRingConfig } from '../types'
import { logger } from '../../logger'

/**
 * Virtual node on the hash ring
 */
interface VirtualNode {
  /** Node identifier */
  nodeId: string
  /** Hash value */
  hash: number
  /** Virtual node index */
  index: number
}

/**
 * Consistent Hash Ring
 * Distributes keys across cache nodes using consistent hashing
 */
export class HashRing {
  private nodes: Map<string, CacheNode> = new Map()
  private virtualNodes: VirtualNode[] = []
  private config: HashRingConfig
  private hashFunction: (key: string) => number
  
  constructor(config: HashRingConfig) {
    this.config = config
    this.hashFunction = this.selectHashFunction(config.hashFunction || 'murmur')
  }
  
  /**
   * Add a node to the hash ring
   */
  addNode(node: CacheNode): void {
    if (this.nodes.has(node.id)) {
      logger.warn(`[HashRing] Node ${node.id} already exists`, { category: 'cache' })
      return
    }
    
    this.nodes.set(node.id, node)
    
    // Create virtual nodes for this node
    const virtualNodes = this.createVirtualNodes(node)
    this.virtualNodes.push(...virtualNodes)
    
    // Sort by hash value
    this.virtualNodes.sort((a, b) => a.hash - b.hash)
    
    logger.debug(`[HashRing] Added node ${node.id} with ${virtualNodes.length} virtual nodes`, { 
      category: 'cache' 
    })
  }
  
  /**
   * Remove a node from the hash ring
   */
  removeNode(nodeId: string): void {
    if (!this.nodes.has(nodeId)) {
      return
    }
    
    this.nodes.delete(nodeId)
    
    // Remove all virtual nodes for this node
    this.virtualNodes = this.virtualNodes.filter(vn => vn.nodeId !== nodeId)
    
    logger.debug(`[HashRing] Removed node ${nodeId}`, { category: 'cache' })
  }
  
  /**
   * Get the node responsible for a key
   */
  getNodeForKey(key: string): CacheNode | null {
    if (this.nodes.size === 0) {
      return null
    }
    
    const hash = this.hashFunction(key)
    
    // Find the first virtual node with hash >= key hash
    const index = this.findVirtualNodeIndex(hash)
    
    if (index === -1) {
      // Wrap around to first node
      const firstNode = this.virtualNodes[0]
      return this.nodes.get(firstNode.nodeId) || null
    }
    
    const virtualNode = this.virtualNodes[index]
    return this.nodes.get(virtualNode.nodeId) || null
  }
  
  /**
   * Get all nodes responsible for a key (for replication)
   */
  getNodesForKey(key: string, replicationFactor: number): CacheNode[] {
    if (this.nodes.size === 0) {
      return []
    }
    
    const hash = this.hashFunction(key)
    const result: CacheNode[] = []
    const seen = new Set<string>()
    
    // Start from the node responsible for the key
    let index = this.findVirtualNodeIndex(hash)
    if (index === -1) {
      index = 0
    }
    
    // Collect nodes for replication
    while (result.length < replicationFactor && result.length < this.nodes.size) {
      const virtualNode = this.virtualNodes[index]
      const node = this.nodes.get(virtualNode.nodeId)
      
      if (node && !seen.has(node.id)) {
        result.push(node)
        seen.add(node.id)
      }
      
      // Move to next virtual node
      index = (index + 1) % this.virtualNodes.length
    }
    
    return result
  }
  
  /**
   * Get all nodes in the ring
   */
  getAllNodes(): CacheNode[] {
    return Array.from(this.nodes.values())
  }
  
  /**
   * Get node by ID
   */
  getNode(nodeId: string): CacheNode | null {
    return this.nodes.get(nodeId) || null
  }
  
  /**
   * Get ring statistics
   */
  getStats(): {
    nodeCount: number
    virtualNodeCount: number
    distribution: Map<string, number>
  } {
    const distribution = new Map<string, number>()
    
    for (const virtualNode of this.virtualNodes) {
      const count = distribution.get(virtualNode.nodeId) || 0
      distribution.set(virtualNode.nodeId, count + 1)
    }
    
    return {
      nodeCount: this.nodes.size,
      virtualNodeCount: this.virtualNodes.length,
      distribution,
    }
  }
  
  /**
   * Create virtual nodes for a physical node
   */
  private createVirtualNodes(node: CacheNode): VirtualNode[] {
    const virtualNodes: VirtualNode[] = []
    const count = this.config.virtualNodes
    
    for (let i = 0; i < count; i++) {
      const virtualKey = `${node.id}#${i}`
      const hash = this.hashFunction(virtualKey)
      
      virtualNodes.push({
        nodeId: node.id,
        hash,
        index: i,
      })
    }
    
    return virtualNodes
  }
  
  /**
   * Find the virtual node index for a hash
   */
  private findVirtualNodeIndex(hash: number): number {
    let left = 0
    let right = this.virtualNodes.length - 1
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      
      if (this.virtualNodes[mid].hash >= hash) {
        if (mid === 0 || this.virtualNodes[mid - 1].hash < hash) {
          return mid
        }
        right = mid - 1
      } else {
        left = mid + 1
      }
    }
    
    return -1
  }
  
  /**
   * Select hash function
   */
  private selectHashFunction(type: string): (key: string) => number {
    switch (type) {
      case 'md5':
        return this.md5Hash
      case 'sha1':
        return this.sha1Hash
      case 'crc32':
        return this.crc32Hash
      case 'murmur':
      default:
        return this.murmurHash
    }
  }
  
  /**
   * Simple MD5-like hash (for demonstration)
   */
  private md5Hash(key: string): number {
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }
  
  /**
   * Simple SHA1-like hash (for demonstration)
   */
  private sha1Hash(key: string): number {
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = ((hash << 5) - hash) + char * (i + 1)
      hash = hash & hash
    }
    return Math.abs(hash)
  }
  
  /**
   * CRC32 hash
   */
  private crc32Hash(key: string): number {
    let crc = 0xFFFFFFFF
    for (let i = 0; i < key.length; i++) {
      const byte = key.charCodeAt(i)
      crc = crc ^ byte
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0
  }
  
  /**
   * MurmurHash3-like implementation
   */
  private murmurHash(key: string): number {
    const c1 = 0xCC9E2D51
    const c2 = 0x1B873593
    const r1 = 15
    const r2 = 13
    const m = 5
    const n = 0xE6546B64
    
    let h = 0
    const len = key.length
    const nblocks = Math.floor(len / 4)
    
    for (let i = 0; i < nblocks; i++) {
      const k = key.charCodeAt(i * 4) | 
                (key.charCodeAt(i * 4 + 1) << 8) | 
                (key.charCodeAt(i * 4 + 2) << 16) | 
                (key.charCodeAt(i * 4 + 3) << 24)
      
      let k1 = k
      k1 = (k1 * c1) >>> 0
      k1 = ((k1 << r1) | (k1 >>> (32 - r1))) >>> 0
      k1 = (k1 * c2) >>> 0
      
      h ^= k1
      h = ((h << 13) | (h >>> (32 - 13))) >>> 0
      h = (h * m + n) >>> 0
    }
    
    const k1 = len % 4
    if (k1 > 0) {
      let k = 0
      for (let i = 0; i < k1; i++) {
        k |= key.charCodeAt(nblocks * 4 + i) << (i * 8)
      }
      
      let k1Value = k
      k1Value = (k1Value * c1) >>> 0
      k1Value = ((k1Value << r1) | (k1Value >>> (32 - r1))) >>> 0
      k1Value = (k1Value * c2) >>> 0
      
      h ^= k1Value
    }
    
    h ^= len
    h ^= h >>> 16
    h = (h * 0x85EBCA6B) >>> 0
    h ^= h >>> 13
    h = (h * 0xC2B2AE35) >>> 0
    h ^= h >>> 16
    
    return h >>> 0
  }
}