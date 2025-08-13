/**
 * Supabase 通用 Hooks
 * 
 * 提供通用的 Supabase 操作封装
 */

import { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

/**
 * 使用 Supabase 客户端
 */
export function useSupabase() {
  return supabase
}

/**
 * 实时订阅 Hook
 */
export function useRealtimeSubscription<T extends Record<string, any>>(
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void,
  filter?: string
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    const newChannel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table,
          filter
        },
        callback
      )
      .subscribe()

    setChannel(newChannel)

    return () => {
      if (newChannel) {
        supabase.removeChannel(newChannel)
      }
    }
  }, [table, filter])

  return channel
}

/**
 * 存储文件上传 Hook
 */
export function useStorageUpload(bucket: string) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const upload = async (file: File, path?: string) => {
    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      const fileName = path || `${Date.now()}-${file.name}`
      
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          onUploadProgress: (progress) => {
            setProgress((progress.loaded / progress.total) * 100)
          }
        })

      if (uploadError) throw uploadError

      // 获取公共 URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

      return { path: data.path, url: publicUrl }
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setUploading(false)
    }
  }

  const remove = async (path: string) => {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) throw error
  }

  return {
    upload,
    remove,
    uploading,
    progress,
    error
  }
}

/**
 * 分页查询 Hook
 */
export function usePaginatedQuery<T extends Record<string, any>>(
  table: string,
  options?: {
    pageSize?: number
    orderBy?: string
    ascending?: boolean
    select?: string
    filter?: Record<string, any>
  }
) {
  const [data, setData] = useState<T[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const pageSize = options?.pageSize || 20
  const select = options?.select || '*'
  const orderBy = options?.orderBy || 'created_at'
  const ascending = options?.ascending ?? false

  const fetchPage = async (pageNumber: number) => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from(table)
        .select(select, { count: 'exact' })

      // 应用过滤器
      if (options?.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })
      }

      // 排序
      query = query.order(orderBy, { ascending })

      // 分页
      const from = (pageNumber - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data: result, count, error: queryError } = await query

      if (queryError) throw queryError

      setData(result || [])
      setPage(pageNumber)
      setTotalPages(Math.ceil((count || 0) / pageSize))
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  const nextPage = () => {
    if (page < totalPages) {
      fetchPage(page + 1)
    }
  }

  const previousPage = () => {
    if (page > 1) {
      fetchPage(page - 1)
    }
  }

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      fetchPage(pageNumber)
    }
  }

  useEffect(() => {
    fetchPage(1)
  }, [table, JSON.stringify(options?.filter)])

  return {
    data,
    page,
    totalPages,
    loading,
    error,
    nextPage,
    previousPage,
    goToPage,
    refetch: () => fetchPage(page)
  }
}

/**
 * 自动保存 Hook
 */
export function useAutoSave<T extends Record<string, any>>(
  table: string,
  id: string | undefined,
  data: T,
  debounceMs = 1000,
  enabled = true
) {
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  useEffect(() => {
    if (!enabled || !id || !data) return

    const timer = setTimeout(async () => {
      setSaving(true)
      
      try {
        const { error } = await supabase
          .from(table)
          .update(data)
          .eq('id', id)

        if (error) throw error
        
        setLastSaved(new Date())
      } catch (error) {
        console.error('Auto-save failed:', error)
      } finally {
        setSaving(false)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [table, id, JSON.stringify(data), debounceMs, enabled])

  return { saving, lastSaved }
}