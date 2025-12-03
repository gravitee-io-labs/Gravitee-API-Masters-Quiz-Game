/**
 * Admin Console Main Application
 */

class AdminApp {
    constructor() {
        this.currentView = 'questions';
        this.editingQuestion = null;
        this.questions = []; // Store questions for filtering
        this.allQuestions = []; // Store all questions before filtering
        this.results = []; // Store results for sorting
        this.allResults = []; // Store all results before filtering
        this.categories = []; // Store categories
        this.sortColumn = 'id';
        this.sortDirection = 'desc';
        this.questionSortColumn = 'id';
        this.questionSortDirection = 'desc';
        this.filters = {
            search: '',
            minScore: null,
            maxScore: null
        };
        this.questionFilters = {
            search: '',
            type: '',
            status: '',
            category: ''
        };
        this.editingCategory = null;
        this.categoryDistribution = {};
        this.categorySortColumn = 'id';
        this.categorySortDirection = 'asc';
        this.init();
    }
    
    init() {
        console.log('Initializing Admin Console');
        
        // Check if already logged in
        const token = localStorage.getItem('authToken');
        if (token) {
            this.showAdmin();
        } else {
            this.showLogin();
        }
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }
        
        // Logout button
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                await this.handleLogout();
            });
        }
        
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.getAttribute('data-view');
                this.showView(view);
            });
        });
        
        // Questions view
        document.getElementById('addQuestionButton')?.addEventListener('click', () => {
            this.showQuestionModal();
        });
        
        // Question filter listeners
        document.getElementById('questionSearchInput')?.addEventListener('input', (e) => {
            this.questionFilters.search = e.target.value.toLowerCase();
            this.applyQuestionFilters();
        });
        
        document.getElementById('questionTypeFilter')?.addEventListener('change', (e) => {
            this.questionFilters.type = e.target.value;
            this.applyQuestionFilters();
        });
        
        document.getElementById('questionStatusFilter')?.addEventListener('change', (e) => {
            this.questionFilters.status = e.target.value;
            this.applyQuestionFilters();
        });
        
        document.getElementById('clearQuestionFiltersButton')?.addEventListener('click', () => {
            this.clearQuestionFilters();
        });
        
        // Category filter
        document.getElementById('questionCategoryFilter')?.addEventListener('change', (e) => {
            this.questionFilters.category = e.target.value;
            this.applyQuestionFilters();
        });
        
        // Question modal
        document.getElementById('closeModal')?.addEventListener('click', () => {
            this.hideQuestionModal();
        });
        
        document.getElementById('cancelModal')?.addEventListener('click', () => {
            this.hideQuestionModal();
        });
        
        document.getElementById('questionForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleQuestionSubmit();
        });
        
        // Results view
        document.getElementById('refreshResultsButton')?.addEventListener('click', () => {
            this.loadResults();
        });
        
        // Filter listeners
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });
        
        document.getElementById('minScore')?.addEventListener('input', (e) => {
            this.filters.minScore = e.target.value ? parseInt(e.target.value) : null;
            this.applyFilters();
        });
        
        document.getElementById('maxScore')?.addEventListener('input', (e) => {
            this.filters.maxScore = e.target.value ? parseInt(e.target.value) : null;
            this.applyFilters();
        });
        
        document.getElementById('clearFiltersButton')?.addEventListener('click', () => {
            this.clearFilters();
        });
        
        // Result modal
        document.getElementById('closeResultModal')?.addEventListener('click', () => {
            this.hideResultModal();
        });
        
        // Settings form
        document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSettingsSubmit();
        });
        
        // Category management
        document.getElementById('addCategoryButton')?.addEventListener('click', () => {
            this.showCategoryModal();
        });
        
        document.getElementById('closeCategoryModal')?.addEventListener('click', () => {
            this.hideCategoryModal();
        });
        
        document.getElementById('cancelCategoryModal')?.addEventListener('click', () => {
            this.hideCategoryModal();
        });
        
        document.getElementById('categoryForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCategorySubmit();
        });
        
        // Color picker sync
        document.getElementById('categoryColor')?.addEventListener('input', (e) => {
            document.getElementById('categoryColorText').value = e.target.value.toUpperCase();
        });
        
        document.getElementById('categoryColorText')?.addEventListener('input', (e) => {
            const value = e.target.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                document.getElementById('categoryColor').value = value;
            }
        });
    }
    
    showLogin() {
        document.getElementById('loginPage')?.classList.add('active');
        document.getElementById('adminPage')?.classList.remove('active');
    }
    
    showAdmin() {
        document.getElementById('loginPage')?.classList.remove('active');
        document.getElementById('adminPage')?.classList.add('active');
        this.loadView(this.currentView);
    }
    
    async handleLogin() {
        const username = document.getElementById('username')?.value;
        const password = document.getElementById('password')?.value;
        const errorEl = document.getElementById('loginError');
        
        try {
            this.setLoading(true);
            await api.login(username, password);
            errorEl.style.display = 'none';
            this.showAdmin();
        } catch (error) {
            console.error('Login failed:', error);
            errorEl.textContent = 'Invalid credentials. Please try again.';
            errorEl.style.display = 'block';
        } finally {
            this.setLoading(false);
        }
    }
    
    async handleLogout() {
        await api.logout();
        this.showLogin();
    }
    
    showView(viewName) {
        this.currentView = viewName;
        
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`.nav-link[data-view="${viewName}"]`)?.classList.add('active');
        
        // Show view
        document.querySelectorAll('.content-view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}View`)?.classList.add('active');
        
        // Load view data
        this.loadView(viewName);
    }
    
    async loadView(viewName) {
        switch (viewName) {
            case 'questions':
                await this.loadCategories(); // Load categories first for filter
                await this.loadQuestions();
                break;
            case 'categories':
                await this.loadCategoriesView();
                break;
            case 'results':
                await this.loadResults();
                break;
            case 'settings':
                await this.loadCategories(); // Load for distribution
                await this.loadSettings();
                break;
        }
    }
    
    // Questions Management
    async loadQuestions() {
        const tbody = document.getElementById('questionsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="7" class="loading"><i class="ph ph-circle-notch ph-spin"></i> Loading questions...</td></tr>';
        
        try {
            this.allQuestions = await api.getQuestions(true);
            this.questions = [...this.allQuestions];
            this.displayQuestions();
            this.populateCategoryFilter();
        } catch (error) {
            console.error('Failed to load questions:', error);
            tbody.innerHTML = '<tr><td colspan="7" class="loading">Error loading questions</td></tr>';
            this.showToast('Failed to load questions', 'error');
        }
    }
    
    // Load categories for filters and dropdowns
    async loadCategories() {
        try {
            this.categories = await api.getCategories(true);
            this.populateCategoryDropdowns();
        } catch (error) {
            console.error('Failed to load categories:', error);
            this.categories = [];
        }
    }
    
    populateCategoryFilter() {
        const filter = document.getElementById('questionCategoryFilter');
        if (!filter) return;
        
        // Keep "All" option
        filter.innerHTML = '<option value="">All</option>';
        filter.innerHTML += '<option value="none">No Category</option>';
        
        this.categories.forEach(cat => {
            if (cat.is_active) {
                filter.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            }
        });
    }
    
    populateCategoryDropdowns() {
        // Question form dropdown
        const questionCategorySelect = document.getElementById('questionCategory');
        if (questionCategorySelect) {
            questionCategorySelect.innerHTML = '<option value="">No Category</option>';
            this.categories.forEach(cat => {
                if (cat.is_active) {
                    questionCategorySelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
                }
            });
        }
    }
    
    applyQuestionFilters() {
        let filtered = [...this.allQuestions];
        
        // Search filter
        if (this.questionFilters.search) {
            const search = this.questionFilters.search.toLowerCase();
            filtered = filtered.filter(q => 
                q.question_text_en.toLowerCase().includes(search) ||
                q.question_text_fr.toLowerCase().includes(search)
            );
        }
        
        // Type filter
        if (this.questionFilters.type) {
            filtered = filtered.filter(q => q.question_type === this.questionFilters.type);
        }
        
        // Status filter
        if (this.questionFilters.status !== '') {
            const isActive = this.questionFilters.status === 'active';
            filtered = filtered.filter(q => q.is_active === isActive);
        }
        
        // Category filter
        if (this.questionFilters.category !== '') {
            if (this.questionFilters.category === 'none') {
                filtered = filtered.filter(q => !q.category_id);
            } else {
                const catId = parseInt(this.questionFilters.category);
                filtered = filtered.filter(q => q.category_id === catId);
            }
        }
        
        this.questions = filtered;
        this.displayQuestions();
    }
    
    clearQuestionFilters() {
        this.questionFilters = { search: '', type: '', status: '', category: '' };
        document.getElementById('questionSearchInput').value = '';
        document.getElementById('questionTypeFilter').value = '';
        document.getElementById('questionStatusFilter').value = '';
        document.getElementById('questionCategoryFilter').value = '';
        this.questions = [...this.allQuestions];
        this.displayQuestions();
    }
    
    displayQuestions() {
        const tbody = document.getElementById('questionsTableBody');
        if (!tbody) return;
        
        if (this.questions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No questions found</td></tr>';
            return;
        }
        
        // Sort questions
        const sorted = [...this.questions].sort((a, b) => {
            let aVal, bVal;
            
            switch(this.questionSortColumn) {
                case 'id':
                    aVal = a.id;
                    bVal = b.id;
                    break;
                case 'question':
                    aVal = a.question_text_en.toLowerCase();
                    bVal = b.question_text_en.toLowerCase();
                    break;
                case 'category':
                    aVal = a.category?.name?.toLowerCase() || 'zzz';
                    bVal = b.category?.name?.toLowerCase() || 'zzz';
                    break;
                case 'type':
                    aVal = a.question_type;
                    bVal = b.question_type;
                    break;
                case 'answer':
                    aVal = a.correct_answer;
                    bVal = b.correct_answer;
                    break;
                case 'status':
                    aVal = a.is_active ? 1 : 0;
                    bVal = b.is_active ? 1 : 0;
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return this.questionSortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.questionSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        
        tbody.innerHTML = '';
        sorted.forEach(q => {
            const row = document.createElement('tr');
            
            // Build category tag
            let categoryHtml = '<span class="category-tag category-tag-none">None</span>';
            if (q.category) {
                categoryHtml = `<span class="category-tag" style="background-color: ${q.category.color}">${q.category.name}</span>`;
            }
            
            row.innerHTML = `
                <td>${q.id}</td>
                <td>${q.question_text_en.substring(0, 60)}...</td>
                <td>${categoryHtml}</td>
                <td>${q.question_type}</td>
                <td>${q.correct_answer}</td>
                <td><span class="status-badge ${q.is_active ? 'active' : 'inactive'}">${q.is_active ? 'Active' : 'Inactive'}</span></td>
                <td class="action-buttons">
                    <button class="btn btn-small btn-secondary" onclick="window.adminApp.editQuestion(${q.id})">
                        <i class="ph ph-pencil"></i>
                        Edit
                    </button>
                    <button class="btn btn-small btn-danger" onclick="window.adminApp.deleteQuestion(${q.id})">
                        <i class="ph ph-trash"></i>
                        Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        this.updateQuestionSortIndicators();
    }
    
    sortQuestions(column) {
        if (this.questionSortColumn === column) {
            this.questionSortDirection = this.questionSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.questionSortColumn = column;
            this.questionSortDirection = 'desc';
        }
        this.displayQuestions();
    }
    
    updateQuestionSortIndicators() {
        document.querySelectorAll('#questionsView th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        
        const sortMap = {
            'id': 0,
            'question': 1,
            'category': 2,
            'type': 3,
            'answer': 4,
            'status': 5
        };
        
        const index = sortMap[this.questionSortColumn];
        if (index !== undefined) {
            const headers = document.querySelectorAll('#questionsView th');
            if (headers[index]) {
                headers[index].classList.add(this.questionSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        }
    }
    
    showQuestionModal(question = null) {
        this.editingQuestion = question;
        const modal = document.getElementById('questionModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('questionForm');
        
        // Ensure category dropdown is populated
        this.populateCategoryDropdowns();
        
        if (question) {
            title.textContent = 'Edit Question';
            document.getElementById('questionId').value = question.id;
            document.getElementById('questionTextEn').value = question.question_text_en;
            document.getElementById('questionTextFr').value = question.question_text_fr;
            document.getElementById('questionType').value = question.question_type;
            document.getElementById('mediaUrl').value = question.media_url || '';
            document.getElementById('correctAnswer').value = question.correct_answer;
            document.getElementById('difficulty').value = question.difficulty;
            document.getElementById('greenLabelEn').value = question.green_label_en;
            document.getElementById('greenLabelFr').value = question.green_label_fr;
            document.getElementById('redLabelEn').value = question.red_label_en;
            document.getElementById('redLabelFr').value = question.red_label_fr;
            document.getElementById('explanationEn').value = question.explanation_en || '';
            document.getElementById('explanationFr').value = question.explanation_fr || '';
            document.getElementById('isActive').checked = question.is_active;
            document.getElementById('questionCategory').value = question.category_id || '';
        } else {
            title.textContent = 'Add Question';
            form.reset();
            document.getElementById('questionId').value = '';
            document.getElementById('questionCategory').value = '';
        }
        
        modal.style.display = 'flex';
    }
    
    hideQuestionModal() {
        document.getElementById('questionModal').style.display = 'none';
        this.editingQuestion = null;
    }
    
    async editQuestion(id) {
        try {
            this.setLoading(true);
            const question = await api.getQuestion(id);
            this.showQuestionModal(question);
        } catch (error) {
            console.error('Failed to load question:', error);
            this.showToast('Failed to load question', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    async handleQuestionSubmit() {
        const form = document.getElementById('questionForm');
        const formData = new FormData(form);
        
        const categoryValue = formData.get('category_id');
        
        const data = {
            question_text_en: formData.get('question_text_en'),
            question_text_fr: formData.get('question_text_fr'),
            question_type: formData.get('question_type'),
            media_url: formData.get('media_url') || null,
            correct_answer: formData.get('correct_answer'),
            difficulty: parseInt(formData.get('difficulty')),
            green_label_en: formData.get('green_label_en'),
            green_label_fr: formData.get('green_label_fr'),
            red_label_en: formData.get('red_label_en'),
            red_label_fr: formData.get('red_label_fr'),
            explanation_en: formData.get('explanation_en') || null,
            explanation_fr: formData.get('explanation_fr') || null,
            is_active: formData.get('is_active') === 'on',
            category_id: categoryValue ? parseInt(categoryValue) : null,
        };
        
        try {
            this.setLoading(true);
            const questionId = document.getElementById('questionId').value;
            
            if (questionId) {
                await api.updateQuestion(questionId, data);
                this.showToast('Question updated successfully');
            } else {
                await api.createQuestion(data);
                this.showToast('Question created successfully');
            }
            
            this.hideQuestionModal();
            await this.loadQuestions();
        } catch (error) {
            console.error('Failed to save question:', error);
            this.showToast('Failed to save question', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    async deleteQuestion(id) {
        if (!confirm('Are you sure you want to delete this question?')) {
            return;
        }
        
        try {
            this.setLoading(true);
            await api.deleteQuestion(id);
            this.showToast('Question deleted successfully');
            await this.loadQuestions();
        } catch (error) {
            console.error('Failed to delete question:', error);
            this.showToast('Failed to delete question', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    // Categories Management
    async loadCategoriesView() {
        const tbody = document.getElementById('categoriesTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="7" class="loading"><i class="ph ph-circle-notch ph-spin"></i> Loading categories...</td></tr>';
        
        try {
            this.categories = await api.getCategories(true);
            this.displayCategories();
        } catch (error) {
            console.error('Failed to load categories:', error);
            tbody.innerHTML = '<tr><td colspan="7" class="loading">Error loading categories</td></tr>';
            this.showToast('Failed to load categories', 'error');
        }
    }
    
    displayCategories() {
        const tbody = document.getElementById('categoriesTableBody');
        if (!tbody) return;
        
        if (this.categories.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No categories found. Create your first category!</td></tr>';
            return;
        }
        
        // Sort categories
        const sorted = [...this.categories].sort((a, b) => {
            let aVal, bVal;
            
            switch(this.categorySortColumn) {
                case 'id':
                    aVal = a.id;
                    bVal = b.id;
                    break;
                case 'name':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'color':
                    aVal = a.color;
                    bVal = b.color;
                    break;
                case 'questions':
                    aVal = a.question_count || 0;
                    bVal = b.question_count || 0;
                    break;
                case 'status':
                    aVal = a.is_active ? 1 : 0;
                    bVal = b.is_active ? 1 : 0;
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return this.categorySortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.categorySortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        
        tbody.innerHTML = '';
        sorted.forEach(cat => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${cat.id}</td>
                <td><span class="category-color-badge" style="background-color: ${cat.color}"></span></td>
                <td><strong>${cat.name}</strong></td>
                <td>${cat.description || '<span class="text-muted">No description</span>'}</td>
                <td>${cat.question_count || 0}</td>
                <td><span class="status-badge ${cat.is_active ? 'active' : 'inactive'}">${cat.is_active ? 'Active' : 'Inactive'}</span></td>
                <td class="action-buttons">
                    <button class="btn btn-small btn-secondary" onclick="window.adminApp.editCategory(${cat.id})">
                        <i class="ph ph-pencil"></i>
                        Edit
                    </button>
                    <button class="btn btn-small btn-danger" onclick="window.adminApp.deleteCategory(${cat.id})">
                        <i class="ph ph-trash"></i>
                        Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        this.updateCategorySortIndicators();
    }
    
    sortCategories(column) {
        if (this.categorySortColumn === column) {
            this.categorySortDirection = this.categorySortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.categorySortColumn = column;
            this.categorySortDirection = 'asc';
        }
        this.displayCategories();
    }
    
    updateCategorySortIndicators() {
        document.querySelectorAll('#categoriesView th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        
        const sortMap = {
            'id': 0,
            'color': 1,
            'name': 2,
            'questions': 4,
            'status': 5
        };
        
        const index = sortMap[this.categorySortColumn];
        if (index !== undefined) {
            const headers = document.querySelectorAll('#categoriesView th');
            if (headers[index]) {
                headers[index].classList.add(this.categorySortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        }
    }
    
    showCategoryModal(category = null) {
        this.editingCategory = category;
        const modal = document.getElementById('categoryModal');
        const title = document.getElementById('categoryModalTitle');
        const form = document.getElementById('categoryForm');
        
        if (category) {
            title.textContent = 'Edit Category';
            document.getElementById('categoryId').value = category.id;
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryDescription').value = category.description || '';
            document.getElementById('categoryColor').value = category.color;
            document.getElementById('categoryColorText').value = category.color.toUpperCase();
            document.getElementById('categoryIsActive').checked = category.is_active;
        } else {
            title.textContent = 'Add Category';
            form.reset();
            document.getElementById('categoryId').value = '';
            document.getElementById('categoryColor').value = '#FC5607';
            document.getElementById('categoryColorText').value = '#FC5607';
            document.getElementById('categoryIsActive').checked = true;
        }
        
        modal.style.display = 'flex';
    }
    
    hideCategoryModal() {
        document.getElementById('categoryModal').style.display = 'none';
        this.editingCategory = null;
    }
    
    async editCategory(id) {
        try {
            this.setLoading(true);
            const category = await api.getCategory(id);
            this.showCategoryModal(category);
        } catch (error) {
            console.error('Failed to load category:', error);
            this.showToast('Failed to load category', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    async handleCategorySubmit() {
        const form = document.getElementById('categoryForm');
        const formData = new FormData(form);
        
        const data = {
            name: formData.get('name'),
            description: formData.get('description') || null,
            color: formData.get('color'),
            is_active: formData.get('is_active') === 'on',
        };
        
        try {
            this.setLoading(true);
            const categoryId = document.getElementById('categoryId').value;
            
            if (categoryId) {
                await api.updateCategory(categoryId, data);
                this.showToast('Category updated successfully');
            } else {
                await api.createCategory(data);
                this.showToast('Category created successfully');
            }
            
            this.hideCategoryModal();
            await this.loadCategoriesView();
        } catch (error) {
            console.error('Failed to save category:', error);
            this.showToast('Failed to save category', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    async deleteCategory(id) {
        const category = this.categories.find(c => c.id === id);
        const questionCount = category?.question_count || 0;
        
        let message = 'Are you sure you want to delete this category?';
        if (questionCount > 0) {
            message += `\n\nThis category has ${questionCount} question(s). They will be set to "No Category".`;
        }
        
        if (!confirm(message)) {
            return;
        }
        
        try {
            this.setLoading(true);
            await api.deleteCategory(id);
            this.showToast('Category deleted successfully');
            await this.loadCategoriesView();
        } catch (error) {
            console.error('Failed to delete category:', error);
            this.showToast('Failed to delete category', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    // Results Management
    async loadResults() {
        const tbody = document.getElementById('resultsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Loading...</td></tr>';
        
        try {
            this.allResults = await api.getResults();
            this.results = [...this.allResults]; // Start with all results
            this.displayResults();
        } catch (error) {
            console.error('Failed to load results:', error);
            tbody.innerHTML = '<tr><td colspan="8" class="loading">Error loading results</td></tr>';
            this.showToast('Failed to load results', 'error');
        }
    }
    
    displayResults() {
        const tbody = document.getElementById('resultsTableBody');
        if (!tbody) return;
        
        if (this.results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="loading">No results found</td></tr>';
            return;
        }
        
        // Sort results
        const sorted = [...this.results].sort((a, b) => {
            let aVal, bVal;
            
            switch(this.sortColumn) {
                case 'id':
                    aVal = a.id;
                    bVal = b.id;
                    break;
                case 'player':
                    aVal = `${a.player.first_name} ${a.player.last_name}`.toLowerCase();
                    bVal = `${b.player.first_name} ${b.player.last_name}`.toLowerCase();
                    break;
                case 'score':
                    aVal = a.total_score;
                    bVal = b.total_score;
                    break;
                case 'correct':
                    aVal = a.correct_answers;
                    bVal = b.correct_answers;
                    break;
                case 'wrong':
                    aVal = a.wrong_answers;
                    bVal = b.wrong_answers;
                    break;
                case 'date':
                    aVal = new Date(a.completed_at);
                    bVal = new Date(b.completed_at);
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        
        tbody.innerHTML = '';
        sorted.forEach(r => {
            const row = document.createElement('tr');
            const date = new Date(r.completed_at).toLocaleString();
            const phoneNumber = r.player.phone_number || '-';
            row.innerHTML = `
                <td>${r.id}</td>
                <td>${r.player.first_name} ${r.player.last_name}</td>
                <td>${r.player.email}</td>
                <td>${phoneNumber}</td>
                <td><strong>${r.total_score}</strong></td>
                <td>${r.correct_answers}</td>
                <td>${r.wrong_answers}</td>
                <td>${date}</td>
                <td class="action-buttons">
                    <button class="btn btn-small btn-secondary" onclick="window.adminApp.viewResult(${r.id})">
                        <i class="ph ph-eye"></i>
                        View
                    </button>
                    <button class="btn btn-small btn-danger" onclick="window.adminApp.deleteResult(${r.id})">
                        <i class="ph ph-trash"></i>
                        Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    sortResults(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'desc';
        }
        this.displayResults();
        this.updateSortIndicators();
    }
    
    updateSortIndicators() {
        document.querySelectorAll('#resultsView th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        
        const sortMap = {
            'id': 0,
            'player': 1,
            'score': 3,
            'correct': 4,
            'wrong': 5,
            'date': 6
        };
        
        const thIndex = sortMap[this.sortColumn];
        if (thIndex !== undefined) {
            const th = document.querySelectorAll('#resultsView th')[thIndex];
            if (th) {
                th.classList.add(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        }
    }
    
    async viewResult(id) {
        try {
            this.setLoading(true);
            const result = await api.getResult(id);
            this.showResultModal(result);
        } catch (error) {
            console.error('Failed to load result:', error);
            this.showToast('Failed to load result', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    async showResultModal(result) {
        const modal = document.getElementById('resultModal');
        const details = document.getElementById('resultDetails');
        
        const date = new Date(result.completed_at).toLocaleString();
        const phoneNumber = result.player.phone_number || '-';
        
        // Fetch all questions to show question text
        let questionsMap = {};
        try {
            const questions = await api.getQuestions(true);
            questions.forEach(q => {
                questionsMap[q.id] = q;
            });
        } catch (error) {
            console.error('Failed to load questions:', error);
        }
        
        let html = `
            <div class="result-info">
                <div class="result-info-header">
                    <h4>Game Summary</h4>
                    <button class="btn btn-small btn-primary" onclick="window.adminApp.editScore(${result.id})">
                        <i class="ph ph-pencil"></i>
                        Edit Score
                    </button>
                </div>
                <div class="result-info-grid">
                    <div class="result-info-item">
                        <label>Player</label>
                        <strong class="truncate-text">${result.player.first_name} ${result.player.last_name}</strong>
                    </div>
                    <div class="result-info-item">
                        <label>Email</label>
                        <strong class="truncate-text" title="${result.player.email}">${result.player.email}</strong>
                    </div>
                    <div class="result-info-item">
                        <label>Phone</label>
                        <strong class="truncate-text">${phoneNumber}</strong>
                    </div>
                    <div class="result-info-item">
                        <label>Total Score</label>
                        <strong id="displayScore-${result.id}">${result.total_score}</strong>
                    </div>
                    <div class="result-info-item">
                        <label>Correct</label>
                        <strong>${result.correct_answers}</strong>
                    </div>
                    <div class="result-info-item">
                        <label>Wrong</label>
                        <strong>${result.wrong_answers}</strong>
                    </div>
                    <div class="result-info-item">
                        <label>Unanswered</label>
                        <strong>${result.unanswered}</strong>
                    </div>
                    <div class="result-info-item">
                        <label>Completed</label>
                        <strong>${date}</strong>
                    </div>
                </div>
            </div>
            <div class="result-answers">
                <h4>Answers & Questions</h4>
        `;
        
        result.answers.forEach((answer, index) => {
            let className = 'answer-item';
            if (answer.is_correct === true) className += ' correct';
            else if (answer.is_correct === false) className += ' wrong';
            else className += ' unanswered';
            
            const question = questionsMap[answer.question_id];
            const questionText = question ? question.question_text_en : `Question ID: ${answer.question_id}`;
            
            // Get answer text with color indication
            const greenText = question ? question.green_label_en : 'Green';
            const redText = question ? question.red_label_en : 'Red';
            
            // Category tag
            let categoryTag = '';
            if (question && question.category) {
                categoryTag = `<span class="result-category-badge" style="background-color: ${question.category.color}">${question.category.name}</span>`;
            } else {
                categoryTag = `<span class="result-category-badge" style="background-color: #6c757d">Generic</span>`;
            }
            
            const playerAnswerText = answer.player_answer === 'green' ? 
                `🟢 ${greenText}` : 
                (answer.player_answer === 'red' ? `🔴 ${redText}` : 'None');
            
            const correctAnswerText = question ? 
                (question.correct_answer === 'green' ? `🟢 ${greenText}` : `🔴 ${redText}`) : 
                'N/A';
            
            html += `
                <div class="${className}">
                    <div class="answer-header">
                        <strong>Question ${index + 1}</strong>
                        ${categoryTag}
                        <span class="answer-status">${answer.is_correct === true ? '✓ Correct' : answer.is_correct === false ? '✗ Wrong' : '- Unanswered'}</span>
                    </div>
                    <div class="answer-question">${questionText}</div>
                    <div class="answer-details">
                        <span><strong>Player Answer:</strong> ${playerAnswerText}</span>
                        <span><strong>Correct Answer:</strong> ${correctAnswerText}</span>
                        <span><strong>Points:</strong> ${answer.points_earned}</span>
                        <span><strong>Time:</strong> ${answer.time_taken ? answer.time_taken.toFixed(2) + 's' : 'N/A'}</span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        details.innerHTML = html;
        modal.style.display = 'flex';
    }
    
    hideResultModal() {
        document.getElementById('resultModal').style.display = 'none';
    }
    
    async deleteResult(id) {
        if (!confirm('Are you sure you want to delete this result?')) {
            return;
        }
        
        try {
            this.setLoading(true);
            await api.deleteResult(id);
            this.showToast('Result deleted successfully');
            await this.loadResults();
        } catch (error) {
            console.error('Failed to delete result:', error);
            this.showToast('Failed to delete result', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    // Settings Management
    async loadSettings() {
        const form = document.getElementById('settingsForm');
        if (!form) return;
        
        try {
            const settings = await api.getSettings();
            
            document.getElementById('questionsPerGame').value = settings.questions_per_game;
            document.getElementById('timerSeconds').value = settings.timer_seconds;
            document.getElementById('pointsCorrect').value = settings.points_correct;
            document.getElementById('pointsWrong').value = settings.points_wrong;
            document.getElementById('timeBonusMax').value = settings.time_bonus_max;
            
            // Load category distribution
            this.categoryDistribution = settings.category_distribution || {};
            this.renderCategoryDistribution();
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.showToast('Failed to load settings', 'error');
        }
    }
    
    renderCategoryDistribution() {
        const container = document.getElementById('categoryDistributionContainer');
        if (!container) return;
        
        if (this.categories.length === 0) {
            container.innerHTML = '<div class="loading">No categories available. Create categories first.</div>';
            return;
        }
        
        container.innerHTML = '';
        
        // Only show active categories
        const activeCategories = this.categories.filter(c => c.is_active);
        
        if (activeCategories.length === 0) {
            container.innerHTML = '<div class="loading">No active categories. Activate or create categories first.</div>';
            return;
        }
        
        activeCategories.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'category-distribution-item';
            
            const currentValue = this.categoryDistribution[cat.id.toString()] || 0;
            
            item.innerHTML = `
                <div class="category-color" style="background-color: ${cat.color}"></div>
                <span class="category-name">${cat.name}</span>
                <span class="category-questions">(${cat.question_count || 0} questions)</span>
                <div class="category-percentage">
                    <input type="number" 
                           id="dist-${cat.id}" 
                           data-category-id="${cat.id}"
                           min="0" 
                           max="100" 
                           value="${currentValue}"
                           onchange="window.adminApp.updateDistributionTotal()">
                    <span>%</span>
                </div>
            `;
            container.appendChild(item);
        });
        
        this.updateDistributionTotal();
    }
    
    updateDistributionTotal() {
        let total = 0;
        const activeCategories = this.categories.filter(c => c.is_active);
        
        activeCategories.forEach(cat => {
            const input = document.getElementById(`dist-${cat.id}`);
            if (input) {
                total += parseInt(input.value) || 0;
            }
        });
        
        const totalEl = document.getElementById('distributionTotal');
        const statusEl = document.getElementById('distributionStatus');
        
        if (totalEl) totalEl.textContent = `${total}%`;
        
        if (statusEl) {
            if (total === 100) {
                statusEl.textContent = '✓ Valid';
                statusEl.className = 'distribution-status valid';
            } else if (total === 0) {
                statusEl.textContent = '(Random distribution)';
                statusEl.className = 'distribution-status';
            } else {
                statusEl.textContent = `✗ Must equal 100% or 0%`;
                statusEl.className = 'distribution-status invalid';
            }
        }
    }
    
    async handleSettingsSubmit() {
        const form = document.getElementById('settingsForm');
        const formData = new FormData(form);
        
        // Get category distribution
        const distribution = {};
        const activeCategories = this.categories.filter(c => c.is_active);
        let total = 0;
        activeCategories.forEach(cat => {
            const input = document.getElementById(`dist-${cat.id}`);
            if (input) {
                const value = parseInt(input.value) || 0;
                if (value > 0) {
                    distribution[cat.id.toString()] = value;
                }
                total += value;
            }
        });
        
        // If total is 0, clear distribution (random)
        const finalDistribution = total === 0 ? null : distribution;
        
        const data = {
            questions_per_game: parseInt(formData.get('questions_per_game')),
            timer_seconds: parseInt(formData.get('timer_seconds')),
            points_correct: parseInt(formData.get('points_correct')),
            points_wrong: parseInt(formData.get('points_wrong')),
            time_bonus_max: parseInt(formData.get('time_bonus_max')),
            category_distribution: finalDistribution,
        };
        
        try {
            this.setLoading(true);
            await api.updateSettings(data);
            this.categoryDistribution = finalDistribution || {};
            this.showToast('Settings saved successfully');
        } catch (error) {
            console.error('Failed to update settings:', error);
            this.showToast('Failed to update settings', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    // Utility functions
    setLoading(isLoading) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = isLoading ? 'flex' : 'none';
        }
    }
    
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const messageEl = document.getElementById('toastMessage');
        
        if (toast && messageEl) {
            messageEl.textContent = message;
            toast.className = `toast ${type}`;
            toast.style.display = 'block';
            
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        }
    }
    
    applyFilters() {
        // Start with all results
        let filtered = [...this.allResults];
        
        // Apply search filter
        if (this.filters.search) {
            filtered = filtered.filter(r => {
                const playerName = `${r.player.first_name} ${r.player.last_name}`.toLowerCase();
                const email = r.player.email.toLowerCase();
                return playerName.includes(this.filters.search) || email.includes(this.filters.search);
            });
        }
        
        // Apply score filters
        if (this.filters.minScore !== null) {
            filtered = filtered.filter(r => r.total_score >= this.filters.minScore);
        }
        
        if (this.filters.maxScore !== null) {
            filtered = filtered.filter(r => r.total_score <= this.filters.maxScore);
        }
        
        // Update results and display
        this.results = filtered;
        this.displayResults();
    }
    
    clearFilters() {
        this.filters = {
            search: '',
            minScore: null,
            maxScore: null
        };
        
        // Clear input fields
        const searchInput = document.getElementById('searchInput');
        const minScoreInput = document.getElementById('minScore');
        const maxScoreInput = document.getElementById('maxScore');
        
        if (searchInput) searchInput.value = '';
        if (minScoreInput) minScoreInput.value = '';
        if (maxScoreInput) maxScoreInput.value = '';
        
        // Reset to all results
        this.results = [...this.allResults];
        this.displayResults();
    }
    
    async editScore(resultId) {
        const result = this.results.find(r => r.id === resultId);
        if (!result) return;
        
        const newScore = prompt(`Enter new score for ${result.player.first_name} ${result.player.last_name}:`, result.total_score);
        
        if (newScore === null) return; // User cancelled
        
        const score = parseInt(newScore);
        if (isNaN(score) || score < 0) {
            this.showToast('Invalid score value', 'error');
            return;
        }
        
        try {
            this.setLoading(true);
            
            // Update via API
            await api.updateScore(resultId, score);
            
            // Update local data
            result.total_score = score;
            const resultInAll = this.allResults.find(r => r.id === resultId);
            if (resultInAll) {
                resultInAll.total_score = score;
            }
            
            // Update display in modal if open
            const displayElement = document.getElementById(`displayScore-${resultId}`);
            if (displayElement) {
                displayElement.textContent = score;
            }
            
            // Refresh results table
            this.displayResults();
            
            this.showToast('Score updated successfully');
        } catch (error) {
            console.error('Failed to update score:', error);
            this.showToast('Failed to update score', 'error');
        } finally {
            this.setLoading(false);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, starting admin app...');
    window.adminApp = new AdminApp();
});
