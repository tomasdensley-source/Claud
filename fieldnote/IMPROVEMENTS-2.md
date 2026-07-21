# Improvements 2

111. Fixed the canvas gesture hit area by replacing the 1x1 transformed world with a full-viewport outer gesture layer.
112. Split the canvas into an untransformed outer hit target and a transformed inner camera layer.
113. Kept marquee selection in screen coordinates outside the transformed world.
114. Converted draw events from outer view screen coordinates into world coordinates through the live camera transform.
115. Moved empty-canvas tap, pan, pinch, marquee, and draw gestures onto the full-size outer view.
116. Required two fingers for canvas panning while draw mode is active.
117. Preserved one-finger drawing without fighting the pan gesture.
118. Reported camera transform changes from animated values during pan and inertia updates.
119. Throttled animated transform reporting so culling and zoom UI stay live without excessive JS churn.
120. Added finite-value guards before applying camera transforms.
121. Clamped center/focus camera requests to valid zoom values.
122. Guarded fit-to-board scale calculations against NaN or zero viewport values.
123. Used the live camera center for Add panel placement.
124. Used the live camera center for Files panel placement.
125. Centered search results with a minimum 100 percent zoom bump when needed.
126. Changed item drag to start only after a movement threshold.
127. Stopped item wrappers from claiming responder ownership on touch start.
128. Prevented item drag in draw mode.
129. Prevented multi-touch item drag.
130. Prevented locked items from starting drag.
131. Let checkbox taps receive responder ownership before item drag.
132. Let connector-dot taps receive responder ownership before item drag.
133. Let mind-map action chips receive responder ownership before item drag.
134. Restricted connector dots to task cards.
135. Passed connector side information from dots into connection handlers.
136. Blocked dependency connections from locked tasks.
137. Kept task dependency connections task-to-task only.
138. Added cycle-safe dependency traversal.
139. Added cycle-safe downstream task traversal when unchecking completed tasks.
140. Added cycle-safe mind-map descendant traversal.
141. Hid connectors when either endpoint is hidden by a collapsed mind-map branch.
142. Culled connector rendering against the live viewport.
143. Culled minimap content by passing visible items only.
144. Updated minimap navigation math to use measured size instead of hardcoded dimensions.
145. Added minimap selection ring styling.
146. Removed permanent z-index mutation from selection.
147. Kept selected cards visually above neighbors with render-only z-index boosting.
148. Added current board id to undo history snapshots.
149. Restored current board id during undo.
150. Restored current board id during redo.
151. Preserved one history entry per item drag commit.
152. Prevented autosave from leaving the saving flag stuck after failures.
153. Added autosave failure toast feedback.
154. Flushed save on app background transitions.
155. Flushed save on provider unmount.
156. Added queued toast delivery instead of replacing active toasts.
157. Blocked text edits on locked text, task, and mind-map cards.
158. Blocked task toggles on locked tasks.
159. Blocked resize updates on locked cards.
160. Blocked formatting on locked cards.
161. Blocked delete operations for locked cards.
162. Deleted full unlocked mind-map subtrees when deleting a mind-map node.
163. Added an unlock action by toggling the selection lock button state.
164. Added visible lock badges to locked cards.
165. Kept lock and unlock haptics/toasts on the existing selection workflow.
166. Remapped copied item ids during paste.
167. Remapped duplicated item ids during duplicate.
168. Remapped task dependencies when copied dependencies are pasted.
169. Remapped mind-map parent ids when copied parents are pasted.
170. Made paste available from the zoom bar even without a current selection.
171. Added a disabled state for selection-bar paste when the clipboard is empty.
172. Copied picked document files into Fieldnote document storage before storing URIs.
173. Copied picked photos into Fieldnote document storage before placing image cards.
174. Stored durable URIs for working files.
175. Placed uploaded image files as image cards instead of generic file cards.
176. Added working-file placement from the library.
177. Added working-file deletion from the library.
178. Added human-readable file size formatting shared by file cards and panels.
179. Added an Open action for file cards through the platform URL handler.
180. Removed fake audio, PDF, and Markdown creation buttons from Add.
181. Renamed fake folder picking to an honest folder-card action.
182. Wrapped document picker errors in Add with alerts.
183. Wrapped photo picker errors in Add with alerts.
184. Wrapped Files panel picker errors with alerts.
185. Wrapped JSON import picker/read errors with alerts.
186. Wrapped board export with try/catch and toast feedback.
187. Normalized imported board JSON through the migration pipeline.
188. Updated search to skip hidden collapsed mind-map descendants.
189. Removed the stray playlists search placeholder copy.
190. Added Select all to More for visible board cards.
191. Made Android Back close panels before exiting.
192. Dismissed onboarding when opening the gesture guide.
193. Removed unsupported keyboard shortcut claims from the gesture guide.
194. Updated Storage panel with an approximate local data size estimate.
195. Updated More panel version copy to 1.0.4.
196. Bumped Expo app version to 1.0.4.
197. Bumped Android versionCode to 5.
198. Updated README canvas feature notes for the full-viewport gesture layer.
199. Updated README file feature notes for durable local file storage.
200. Updated README draw-mode gesture notes.
201. Expanded drawing item bounds when strokes extend left.
202. Expanded drawing item bounds when strokes extend upward.
203. Expanded drawing item bounds when strokes extend right.
204. Expanded drawing item bounds when strokes extend downward.
205. Shifted existing drawing path points when bounds expand negatively.
206. Implemented eraser mode by removing nearby drawing points instead of painting canvas-colored strokes.
207. Stopped rendering stored eraser paths.
208. Kept highlighter alpha behavior for non-eraser drawing paths.
209. Verified `npx tsc --noEmit` after implementation fixes.
210. Added this audit log so fixes 111-210 are traceable.
