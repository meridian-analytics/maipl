import * as React from "react"

interface SaveContextType {
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (value: boolean) => void
}

const SaveContext = React.createContext<SaveContextType>({
  hasUnsavedChanges: false,
  setHasUnsavedChanges: () => {},
})

export function SaveProvider({ children }: { children: React.ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)

  return (
    <SaveContext.Provider value={{ hasUnsavedChanges, setHasUnsavedChanges }}>
      {children}
    </SaveContext.Provider>
  )
}

export function useSaveContext() {
  return React.useContext(SaveContext)
}
