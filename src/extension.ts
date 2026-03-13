import * as vscode from 'vscode';
import fs from 'node:fs';
import path from 'node:path';

class memeProvider implements vscode.WebviewViewProvider {
	private view?: vscode.WebviewView;

	constructor(private readonly _extensionUri: vscode.Uri) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(this._extensionUri, 'memeassets'),
				vscode.Uri.joinPath(this._extensionUri, 'soundmemeasset')
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
	}

	public showRandomMeme() {
		if (!this.view) {
			return;
		}

		try {
			const assetsPath = path.join(this._extensionUri.fsPath, 'memeassets');
			const files = fs.readdirSync(assetsPath);

			const imageFiles = files.filter(file => {
				const lower = file.toLowerCase();
				return (
					lower.endsWith('.png') ||
					lower.endsWith('.jpg') ||
					lower.endsWith('.jpeg') ||
					lower.endsWith('.gif') ||
					lower.endsWith('.webp')
				);
			});

			if (imageFiles.length === 0) {
				vscode.window.showErrorMessage('no meme images found in memeassets folder');
				return;
			}

			const dameme = imageFiles[Math.floor(Math.random() * imageFiles.length)];
			const imageUri = this.view.webview.asWebviewUri(
				vscode.Uri.joinPath(this._extensionUri, 'memeassets', dameme)
			);

			this.view.webview.postMessage({
				type: 'setMeme',
				src: imageUri.toString()
			});
		} catch (error) {
			console.error(error);
			vscode.window.showErrorMessage(`failed to load meme: ${String(error)}`);
		}
	}

	public playRandomMeme() {
		if (!this.view) {
			return;
		}

		try {
			const assetsPath = path.join(this._extensionUri.fsPath, 'soundmemeasset');
			const files = fs.readdirSync(assetsPath);

			const soundFiles = files.filter(file => {
				const lower = file.toLowerCase();
				return (
					lower.endsWith('.mp3') ||
					lower.endsWith('.wav') ||
					lower.endsWith('.ogg') ||
					lower.endsWith('.m4a')
				);
			});

			if (soundFiles.length === 0) {
				vscode.window.showErrorMessage('no meme sound found in soundmemeasset folder');
				return;
			}

			const dameme = soundFiles[Math.floor(Math.random() * soundFiles.length)];
			const soundUri = this.view.webview.asWebviewUri(
				vscode.Uri.joinPath(this._extensionUri, 'soundmemeasset', dameme)
			);

			this.view.webview.postMessage({
				type: 'playMeme',
				src: soundUri.toString()
			});
		} catch (error) {
			console.error(error);
			vscode.window.showErrorMessage(`failed to load meme sound: ${String(error)}`);
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		try {
			const htmlPath = path.join(this._extensionUri.fsPath, 'index.html');
			let html = fs.readFileSync(htmlPath, 'utf8');

			const script = `
				<script>
					window.addEventListener('message', event => {
						const message = event.data;

						if (message.type === 'setMeme') {
							const img = document.getElementById('goody');
							if (img) {
								img.src = message.src;
							}
						}

						if (message.type === 'playMeme') {
							const audio = document.getElementById('memeaudio');
							if (audio) {
								audio.src = message.src;
								audio.volume = 0.8;
								audio.currentTime = 0;
								audio.load();
								audio.play().catch(err => console.error('audio play failed:', err));
							} else {
								console.error('memeaudio element not found');
							}
						}
					});
				</script>
			`;

			if (html.includes('</body>')) {
				html = html.replace('</body>', `${script}</body>`);
			} else {
				html += script;
			}

			return html;
		} catch (error) {
			console.log(`oh shit! ${error}`);
			return `<h1>HTML failed to load 💀</h1>`;
		}
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Fuh naw!');

	const provider = new memeProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('memeStock', provider)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('cruelworld.cruelWorld', () => {
			provider.showRandomMeme();
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((event) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) return;
			if (event.document !== editor.document) return;

			for (const change of event.contentChanges) {
				if (change.text === '\n' || change.text === '\r\n') {
					provider.showRandomMeme();
					break;
				}

				if (change.text === '' && change.rangeLength > 0) {
					provider.showRandomMeme();
					break;
				}

				if (change.text.length > 1 || change.text.includes('\n')) {
					provider.showRandomMeme();
					break;
				}
			}
		}),
		vscode.window.onDidStartTerminalShellExecution((event) => {
			console.log('terminal command started:', event.execution.commandLine);
			provider.playRandomMeme();
		})
	);

	context.subscriptions.push(
		vscode.window.onDidChangeTextEditorSelection((event) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) return;
			if (event.textEditor !== editor) return;

			const fullText = editor.document.getText();
			const fullRange = new vscode.Range(
				editor.document.positionAt(0),
				editor.document.positionAt(fullText.length)
			);

			for (const sel of event.selections) {
				if (!sel.isEmpty && sel.isEqual(fullRange)) {
					provider.showRandomMeme();
					break;
				}
			}
		})
	);
}

export function deactivate() {}