                    <div class="ql-md-editor">
                        <div aria-label="@lang('messages.description_format')" class="ql-md-toolbar" role="toolbar">
                            <button aria-label="@lang('messages.bold')" class="ql-md-toolbar__btn tip-b" data-md="bold" data-tip="@lang('messages.bold')" type="button">
                                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                                    <path d="M7 5h6a3.5 3.5 0 0 1 0 7h-6l0 -7"></path>
                                    <path d="M13 12h1a3.5 3.5 0 0 1 0 7h-7v-7"></path>
                                </svg>
                            </button>
                            <button aria-label="@lang('messages.italic')" class="ql-md-toolbar__btn tip-b" data-md="italic" data-tip="@lang('messages.italic')" type="button">
                                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                                    <path d="M11 5l6 0"></path>
                                    <path d="M7 19l6 0"></path>
                                    <path d="M14 5l-4 14"></path>
                                </svg>
                            </button>
                            <span aria-hidden="true" class="ql-md-toolbar__sep"></span>
                            <button aria-label="@lang('messages.link')" class="ql-md-toolbar__btn tip-b" data-md="link" data-tip="@lang('messages.link')" type="button">
                                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                                    <path d="M9 15l6 -6"></path>
                                    <path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"></path>
                                    <path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"></path>
                                </svg>
                            </button>
                            <span aria-hidden="true" class="ql-md-toolbar__sep"></span>
                            <button aria-label="@lang('messages.bullet_list')" class="ql-md-toolbar__btn tip-b" data-md="ul" data-tip="@lang('messages.bullet_list')" type="button">
                                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                                    <path d="M9 6l11 0"></path>
                                    <path d="M9 12l11 0"></path>
                                    <path d="M9 18l11 0"></path>
                                    <path d="M5 6l0 .01"></path>
                                    <path d="M5 12l0 .01"></path>
                                    <path d="M5 18l0 .01"></path>
                                </svg>
                            </button>
                            <button aria-label="@lang('messages.numbered_list')" class="ql-md-toolbar__btn tip-b" data-md="ol" data-tip="@lang('messages.numbered_list')" type="button">
                                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                                    <path d="M11 6h9"></path>
                                    <path d="M11 12h9"></path>
                                    <path d="M12 18h8"></path>
                                    <path d="M4 16a2 2 0 1 1 4 0c0 .591 -.5 1 -1 1.5l-3 2.5h4"></path>
                                    <path d="M6 10v-6l-2 2"></path>
                                </svg>
                            </button>
                            <span class="ql-md-toolbar__hint">@lang('messages.markdown_compatible')</span>
                        </div>
                        <textarea class="ql-textarea ql-md-editor__input with-border" id="wizard-description" name="description_session"
                                  placeholder="@lang('messages.description_group_placeholder')" rows="5">{{ old('description_session', $isEdit ? $item->description_session : '') }}</textarea>
                    </div>