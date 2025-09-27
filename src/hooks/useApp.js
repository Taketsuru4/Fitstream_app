import { useContext } from 'react'
import { AppCtx } from '../context/appContext'

export function useApp() {
  return useContext(AppCtx)
}