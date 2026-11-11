import type {Node as ProseMirrorNode, Fragment, Slice} from '@tiptap/pm/model'

/**
 * Serializes a copied slice to plain text, keeping list markers so a copied
 * list still reads like a list ("- item", "1. item", "- [x] item").
 */
export function serializeClipboardText(slice: Slice): string {
	return fragmentLines(slice.content).join('\n')
}

function leafText(leaf: ProseMirrorNode): string {
	if (leaf.type.name === 'hardBreak') {
		return '\n'
	}
	const spec = leaf.type.spec
	if (typeof spec.leafText === 'function') {
		return spec.leafText(leaf)
	}
	return leaf.attrs?.label ?? ''
}

function fragmentLines(fragment: Fragment): string[] {
	const lines: string[] = []
	fragment.forEach(child => lines.push(...nodeLines(child)))
	return lines
}

function prefixLines(lines: string[], marker: string): string[] {
	const indent = ' '.repeat(marker.length)
	if (lines.length === 0) {
		return [marker.trimEnd()]
	}
	return lines.map((line, i) => (i === 0 ? marker : indent) + line)
}

function nodeLines(node: ProseMirrorNode): string[] {
	if (node.isText) {
		return [node.text ?? '']
	}

	if (node.isTextblock) {
		return node.textBetween(0, node.content.size, '\n', leafText).split('\n')
	}

	if (node.isLeaf) {
		const text = leafText(node)
		return text ? text.split('\n') : []
	}

	switch (node.type.name) {
		case 'bulletList': {
			const lines: string[] = []
			node.forEach(item => lines.push(...prefixLines(fragmentLines(item.content), '- ')))
			return lines
		}
		case 'orderedList': {
			const lines: string[] = []
			const start = typeof node.attrs.start === 'number' ? node.attrs.start : 1
			node.forEach((item, _offset, index) => lines.push(...prefixLines(fragmentLines(item.content), `${start + index}. `)))
			return lines
		}
		case 'taskList': {
			const lines: string[] = []
			node.forEach(item => lines.push(...prefixLines(fragmentLines(item.content), item.attrs.checked ? '- [x] ' : '- [ ] ')))
			return lines
		}
		default:
			return fragmentLines(node.content)
	}
}
