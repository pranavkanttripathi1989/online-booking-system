import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Box, IconButton, Stack, Tooltip } from '@mui/material'
import FormatBoldRoundedIcon from '@mui/icons-material/FormatBoldRounded'
import FormatItalicRoundedIcon from '@mui/icons-material/FormatItalicRounded'
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded'
import FormatListNumberedRoundedIcon from '@mui/icons-material/FormatListNumberedRounded'
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded'

function ToolbarButton({ label, active, disabled, onClick, children }) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size="small"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()} // keep editor selection/focus on click
          onClick={onClick}
          sx={{
            color: active ? 'primary.main' : 'text.secondary',
            bgcolor: active ? 'action.selected' : 'transparent',
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  )
}

/**
 * Rich text editor for content later displayed as formatted text to the
 * same or another user (FRONTEND_RULES.md FORM-20) — clinical/encounter
 * notes, prescription instructions, messages, bios, policy/template
 * bodies, review text. Controlled on an HTML string via the same
 * value/onChange/onBlur shape a plain MUI `TextField` uses, so it drops
 * in as a direct replacement.
 *
 * Heavy (TipTap + ProseMirror) — always load via `React.lazy`/`Suspense`
 * (PERF-12), never from an initial bundle. See `RichTextEditor.lazy.jsx`
 * for the canonical lazy wrapper.
 *
 * @param {string} value - current content as an HTML string
 * @param {(html: string) => void} [onChange] - fired on every edit
 * @param {(html: string) => void} [onBlur] - fired when the editor loses focus
 * @param {boolean} [disabled] - renders read-only, hides the toolbar
 * @param {string} [ariaLabelledBy] - id of an external label element (A11Y-6)
 * @param {number} [minHeight]
 */
export default function RichTextEditor({ value, onChange, onBlur, disabled = false, ariaLabelledBy, minHeight = 80 }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } })],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor: e }) => onChange?.(e.getHTML()),
    onBlur: ({ editor: e }) => onBlur?.(e.getHTML()),
    editorProps: {
      attributes: {
        ...(ariaLabelledBy ? { 'aria-labelledby': ariaLabelledBy } : {}),
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
  })

  // Sync content set from outside (e.g. a refetch after save, or the
  // initial load once the encounter query resolves) without clobbering
  // the user's own in-progress typing.
  useEffect(() => {
    if (!editor || value === undefined) return
    if (!editor.isFocused && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, editor])

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [disabled, editor])

  if (!editor) return null

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: disabled ? 'action.hover' : 'background.paper',
        '&:focus-within': disabled
          ? {}
          : {
              borderColor: 'primary.main',
              boxShadow: (theme) => `0 0 0 1px ${theme.palette.primary.main}`,
            },
      }}
    >
      {!disabled && (
        <Stack
          direction="row"
          spacing={0.25}
          flexWrap="wrap"
          sx={{ px: 0.5, py: 0.25, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}
        >
          <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <FormatBoldRoundedIcon fontSize="small" />
          </ToolbarButton>
          <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <FormatItalicRoundedIcon fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            label="Bulleted list"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <FormatListBulletedRoundedIcon fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <FormatListNumberedRoundedIcon fontSize="small" />
          </ToolbarButton>
          <ToolbarButton
            label="Quote"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <FormatQuoteRoundedIcon fontSize="small" />
          </ToolbarButton>
        </Stack>
      )}
      <Box
        onClick={() => !disabled && editor.chain().focus().run()}
        sx={{
          px: 1.5,
          py: 1,
          minHeight,
          cursor: disabled ? 'default' : 'text',
          fontSize: '0.875rem',
          '& .ProseMirror': { outline: 'none' },
          '& .ProseMirror p': { m: 0, mb: 1 },
          '& .ProseMirror p:last-child': { mb: 0 },
          '& .ProseMirror ul, & .ProseMirror ol': { pl: 3, m: 0, mb: 1 },
          '& .ProseMirror blockquote': {
            borderLeft: '3px solid',
            borderColor: 'divider',
            pl: 1.5,
            ml: 0,
            color: 'text.secondary',
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  )
}
