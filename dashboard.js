let employeeData = [];
let skillsData = {};
let charts = {};

// File upload handling
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const mainDashboard = document.getElementById('mainDashboard');

// --- NEW: Get references to modal elements ---
const totalSkillsDiv = document.getElementById('totalSkills'); // Reference to the clickable number
const skillsModal = document.getElementById('skillsModal');
const closeSkillsModalButton = document.getElementById('closeSkillsModal');
const uniqueSkillsListContainer = document.getElementById('uniqueSkillsList');

// Existing event listeners (keep them)
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('drop', handleDrop);
uploadArea.addEventListener('dragleave', handleDragLeave);
fileInput.addEventListener('change', handleFileSelect);

// --- NEW: Event listeners for the modal ---
if (totalSkillsDiv) {
    totalSkillsDiv.addEventListener('click', showUniqueSkillsModal);
}
if (closeSkillsModalButton) {
    closeSkillsModalButton.addEventListener('click', () => {
        skillsModal.style.display = 'none'; // Hide the modal
    });
}

// Close the modal if the user clicks outside of the modal content
window.addEventListener('click', (event) => {
    if (event.target === skillsModal) {
        skillsModal.style.display = 'none';
    }
});


function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

function processFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            processEmployeeData(jsonData);
            showDashboard();
        } catch (error) {
            alert('Error reading file: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function processEmployeeData(data) {
    employeeData = [];
    skillsData = {};

    data.forEach(row => {
        let skills = [];
        if (row['Processed Skills']) {
            if (typeof row['Processed Skills'] === 'string') {
                const skillsString = row['Processed Skills']
                    .replace(/[\[\]'']/g, '')
                    .replace(/,\s*/g, ',');
                skills = skillsString.split(',').map(s => s.trim()).filter(s => s);
            } else if (Array.isArray(row['Processed Skills'])) {
                skills = row['Processed Skills'];
            }
        }

        const employee = {
            id: row['Employee ID'] || row['EmployeeID'] || '',
            name: row['Name'] || '',
            skill: row['Skill'] || '', // This might be a single skill string, not the array of processedSkills
            processedSkills: skills
        };

        employeeData.push(employee);

        skills.forEach(skill => {
            if (skill) {
                skillsData[skill] = (skillsData[skill] || 0) + 1;
            }
        });
    });

    setupSearch();
    updateStats();
    createCharts();
}

function setupSearch() {
    const searchInput = document.getElementById('skillSearch');
    const searchResults = document.getElementById('searchResults');

    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase().trim();

            if (query.length < 2) {
                if (searchResults) {
                    searchResults.style.display = 'none';
                }
                return;
            }

            const matches = employeeData.filter(employee =>
                employee.processedSkills.some(skill =>
                    skill.toLowerCase().includes(query)
                )
            );

            displaySearchResults(matches, query);
        });
    }
}

function displaySearchResults(matches, query) {
    const searchResults = document.getElementById('searchResults');

    if (!searchResults) return;

    if (matches.length === 0) {
        searchResults.innerHTML = "<div class='no-results'>No employees found with this skill</div>";
        searchResults.style.display = 'block';
        return;
    }

    const resultsHTML = matches.map(employee => `
        <div class='employee-card'>
            <div class='employee-name'>${employee.name}</div>
            <div class='employee-id'>ID: ${employee.id}</div>
            <div class='skills-tags'>
                ${employee.processedSkills.map(skill =>
                    `<span class='skill-tag ${skill.toLowerCase().includes(query.toLowerCase()) ? 'highlight' : ''}'>${skill}</span>`
                ).join('')}
            </div>
        </div>
    `).join('');

    searchResults.innerHTML = `
        <h3>Found ${matches.length} employee(s) with matching skills:</h3>
        ${resultsHTML}
    `;
    searchResults.style.display = 'block';
}

function updateStats() {
    const totalEmployees = employeeData.length;
    const totalSkills = Object.keys(skillsData).length;
    const avgSkills = totalEmployees > 0 ?
        (employeeData.reduce((sum, emp) => sum + emp.processedSkills.length, 0) / totalEmployees).toFixed(1) : 0;

    const mostCommonSkill = Object.keys(skillsData).reduce((a, b) =>
        skillsData[a] > skillsData[b] ? a : b, '-');

    document.getElementById('totalEmployees').textContent = totalEmployees;
    document.getElementById('totalSkills').textContent = totalSkills; // This updates the number
    document.getElementById('avgSkills').textContent = avgSkills;
    document.getElementById('mostCommonSkill').textContent = mostCommonSkill;
}

function createCharts() {
    createTopSkillsChart();
    createRoleClassificationChart();
    createEmployeeSkillsChart();
    createSkillCategoriesChart();
}

function createTopSkillsChart() {
    const ctx = document.getElementById('topSkillsChart');
    if (!ctx) return;
    const context = ctx.getContext('2d');
    const sortedSkills = Object.entries(skillsData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    if (charts.topSkills) charts.topSkills.destroy();

    charts.topSkills = new Chart(context, {
        type: 'bar',
        data: {
            labels: sortedSkills.map(([skill]) => skill),
            datasets: [{
                label: 'Number of Employees',
                data: sortedSkills.map(([, count]) => count),
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createRoleClassificationChart() {
    const ctx = document.getElementById('skillsDistributionChart');
    if (!ctx) return;
    const context = ctx.getContext('2d');

    const roleDefinitions = {
        'Cybersecurity': [
            'siem', 'phishing mail analysis', 'log analysis', 'owasp', 'mitre attack framework', 'wireshark',
            'network security', 'iso 27001', 'isms', 'soc 2', 'risk assessment', 'vulnerability management',
            'security audits', 'policy and procedure creation', 'is governance & compliance',
            'cybersecurity framework implementation', 'nist csf', 'cs&rf', 'third party risk management',
            'security operations center', 'soc oversight', 'compliance audits', 'gap assessments',
            'information security', 'information security management systems', 'trpm'
        ],
        'Design': [
            'ux research', 'interaction design', 'design system', 'prototyping', 'user-centric design',
            'design thinking', 'information architecture', 'figma', 'usability testing', 'user experience design',
            'ued', 'user interface design', 'ui ux', 'user experience', 'ux', 'responsive web design',
            'user interface prototyping', 'ui ux designer', 'mockups', 'design principles', 'creativity',
            'innovation', 'design software', 'art direction', 'adobe photoshop', 'adobe illustrator', 'canva', 'wix'
        ],
        'Accounts': [
            'accounts', 'gst returns', 'tally', 'sap', 'accounting', 'book keeping', 'reconciliation',
            'financial accounting', 'tax accounting', 'internal controls', 'audit',
            'financial analysis and interpretation', 'financial discrepancies', 'financial records',
            'accounting principles', 'fraud detection', 'aml compliance', 'treasury management',
            'transaction monitoring', 'anti money laundering', 'tally erp', 'sap fico', 'uae vat',
            'journal entry posting', 'vba macros', 'general ledger reconciliation', 'financial statements'
        ],
        'Marketing': [
            'digital marketing', 'marketing strategies', 'market analysis', 'content marketing', 'social media marketing',
            'creative thinking', 'strategic thinking', 'ai tools', 'chatgpt', 'adobe fire fly',
            'shutterstock ai generator', 'google analytics', 'google ads', 'meta ads', 'google search console',
            'ahref', 'semrush', 'uber suggest', 'screaming frog', 'firebase', 'photography', 'videography', 'editing',
            'engaging content', 'copywriting', 'seo', 'brand tone', 'prompts', 'content briefs'
        ],
        'HR': [
            'human resources', 'recruitment', 'onboarding', 'employee relations', 'talent management',
            'compensation', 'benefits', 'performance management', 'hr policies', 'diversity', 'inclusion',
            'team management', 'relationship building', 'collaboration', 'teamwork', 'conflict resolution',
            'communication', 'adaptability', 'patience'
        ],
        'Quality Assurance (QA)': [
            'qa', 'manual testing', 'jura', 'winscp', 'swagger', 'stlc', 'sdlc', 'dbever', 'sqldbx', 'server logs',
            'mobile app testing', 'backend testing', 'web application testing', 'postman', 'jmeter',
            'crm tool', 'db knowledge (mysql, oracle, hasura)', 'manaul testing',
            'api testing', 'selenium java automation', 'sql queries', 'core java testing', 'cucumber', 'junit',
            'testng', 'pom', 'design pattern testing', 'data driven framework', 'fe automation', 'ui automation',
            'be automation', 'api automation', 'load test', 'rest assured', 'framework creation', 'azuredevaps',
            'appium automation', 'mobile testing', 'charles proxy', 'api mocks', 'jacoco', 'nyc codecoverage tools'
        ],
        'Financial Analyst': [
            'financial analysis', 'risk management', 'process testing', 'tax and audit software',
            'financial accounting', 'organizational and time managing', 'reconciliation expert',
            'critical thinking finance', 'financial interpretation', 'financial discrepancies', 'financial records',
            'advanced excel analysis', 'research finance', 'vba macro development',
            'financial markets', 'cross-border remittance', 'fintech', 'stable coins', 'wallets', 'global implementations',
            'aml compliance', 'anti money laundering analysis'
        ],
        'Data Analyst': [
            'tableau', 'power bi', 'analytics', 'data analysis', 'data management', 'google sheets',
            'microsoft power bi', 'data visualization', 'apache spark', 'apache airflow', 'apache kafka',
            'machine learning', 'data science', 'statistics', 'pyspark', 'hadoop', 'data driven decision making',
            'card reconciliation', 'customer kyc verification'
        ],
        'Business Analyst': [
            'business analyst', 'iiba', 'agile development', 'lean design thinking', 'business consulting',
            'transformation business', 'innovation management', 'operations management', 'project management business',
            'strategic consulting', 'product strategy', 'roadmapping', 'api knowledge', 'stakeholder collaboration',
            'process optimization', 'customer onboarding', 'experience design', 'communication business', 'documentation business',
            'transaction-based workflows', 'business process automation', 'rpa', 'product specialist',
            'remittance operations', 'payments operations', 'business analysis', 'sdlc', 'agile scrum',
            'jira business', 'confluence business', 'it service management', 'api integrations',
            'strategic planning', 'decision-making', 'problem solving business', 'critical thinking business',
            'time management business', 'adaptability business', 'teamwork business', 'collaboration business',
            'cross-functional collaboration', 'customer relationship management', 'change management',
            'root cause analysis business', 'lead generation', 'regulatory compliance',
            'internal controls implementation', 'revenue recognition', 'working capital management',
            'financial statement preparation', 'budget planning', 'financial forecasting', 'risk mitigation business',
            'project management professional'
        ],
        'Project Manager': [
            'project management professional', 'project management', 'agile project', 'sdlc project', 'team management project',
            'vendor management', 'project management tools', 'jira project', 'notion project', 'microsoft project',
            'risk management project', 'resource allocation', 'change management project', 'end to end project lifecycle',
            'cross functional team coordination', 'team leadership', 'mentoring', 'decision making under pressure',
            'business/system analysis project', 'it service management project', 'ticketing platform management',
            'program management', 'strategic planning project', 'time management prioritization',
            'adaptability resilience', 'customer onboarding project', 'stakeholder collaboration project'
        ],
        'Programmer': [
            'java', 'python', 'c++', 'c', 'javascript', 'typescript', 'swift', 'objective c', 'kotlin', 'html', 'css',
            'react', 'angular', 'node.js', 'django', 'flask', 'fastapi', 'spring', 'springboot', 'hibernate', 'jpa',
            'microservices', 'developer', 'frontend', 'backend', 'fullstack', 'sql', 'oracle', 'mysql', 'postgresql',
            'mongodb', 'rest api', 'soap api', 'json', 'codable', 'mvvm', 'mvc', 'uikit', 'swiftui', 'sdk frameworks',
            'coredata', 'pl/sql', 'php', 'asp .net', 'android studio', 'restful api integration', 'gradle', 'maven',
            'junit', 'mockito', 'selenium', 'test automation', 'cucumber', 'testng', 'karate', 'restassured', 'jmeter',
            'postman', 'swagger', 'api testing', 'automation framework development', 'go', 'rust', 'r language', 'weka', 'pyspark',
            'apache airflow', 'apache kafka', 'machine learning programming', 'data science programming', 'statistics programming', 'tensorflow', 'pytorch',
            'opencv', 'yolo', 'cnn', 'ocr', 'image processing coding', 'solace', 'firebase', 'flutter', 'dart', 'retrofit',
            'room db', 'dependency injection', 'koin', 'hilt', 'shared preferences', 'data store', 'keycloak',
            'rabbitmq', 'nifi', 'elastic search', 'solr', 'logstash', 'kibana', 'gravitee', 'hystrix', 'eureka',
            'ribbon', 'jhipster', 'sybase', 'web services', 'apache server', 'zuul proxy', 'apache camel', 'ibatis',
            'struts', 'jsp', 'jquery', 'bootstrap', 'tailwind css', 'materialui', 'redux', 'express', 'vite+react',
            'coding', 'programming' // Added more generic programming terms
        ],
        'DevOps Engineer': [
            'devops tools', 'kubernetes', 'azure devops', 'aws', 'azure', 'oracle cloud', 'google cloud',
            'linux servers', 'cloud', 'containers', 'automation tools', 'jenkins', 'gitlab',
            'docker', 'ci/cd', 'terraform', 'ansible', 'apache kafka', 'azure vault', 'git', 'github', 'bitbucket',
            'svn', 'helm', 'solace', 'ec2', 'kibana', 'es', 'cassandra', 'adb', 'chrome inspect devices',
            'goreplay', 'j-meter', 'load testing', 'browserstack', 'lambdatest', 'api development', 'version control',
            'gradle', 'maven', 'networking', 'routing', 'switching', 'security', 'cloud networking', 'load balancers',
            'system administration', 'prometheus', 'grafana', 'containerisation', 'shell scripting', 'bash scripting'
        ],
        'General Office/Support': [
            'ms office', 'windows', 'ms word', 'ms excel', 'power point', 'crm', 'service desk',
            'good at excel', 'typing speed', 'excel', 'word', 'tally', 'data entry', 'basic excel', 'communication',
            'time management', 'problem solving general', 'leadership general', 'customer support', 'chat', 'email',
            'empathy', 'emotional intelligence', 'active listening'
        ]
    };

    const roleCounts = {};
    Object.keys(roleDefinitions).forEach(role => roleCounts[role] = 0);
    roleCounts['Others'] = 0;

    employeeData.forEach(emp => {
        let roleMatched = 'Others';
        const skills = Array.isArray(emp.processedSkills) ? emp.processedSkills.map(s => s.toLowerCase()) : [];

        for (const [role, keywords] of Object.entries(roleDefinitions)) {
            if (keywords.some(keyword => skills.some(skill => skill.includes(keyword)))) {
                roleMatched = role;
                break;
            }
        }
        roleCounts[roleMatched]++;
    });

    if (charts.skillsDistribution) {
        charts.skillsDistribution.destroy();
    }

    charts.skillsDistribution = new Chart(context, {
        type: 'pie',
        data: {
            labels: Object.keys(roleCounts),
            datasets: [{
                data: Object.values(roleCounts),
                backgroundColor: [
                    '#667eea', '#764ba2', '#f093fb', '#f5576c',
                    '#4facfe', '#00f2fe', '#fa709a', '#fee140',
                    '#a1c4fd', '#c2e9fb', '#cfd9ed', '#fddb92'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const value = context.raw;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                },
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Distribution of Employee Roles Based on Skills'
                }
            }
        }
    });
}


function createEmployeeSkillsChart() {
    const ctx = document.getElementById('employeeSkillsChart');
    if (!ctx) return;
    const context = ctx.getContext('2d');
    const skillCounts = employeeData.map(emp => emp.processedSkills.length);
    const distribution = {};

    skillCounts.forEach(count => {
        const range = Math.floor(count / 5) * 5;
        const label = `${range}-${range + 4} skills`;
        distribution[label] = (distribution[label] || 0) + 1;
    });

    if (charts.employeeSkills) charts.employeeSkills.destroy();

    charts.employeeSkills = new Chart(context, {
        type: 'bar',
        data: {
            labels: Object.keys(distribution),
            datasets: [{
                label: 'Number of Employees',
                data: Object.values(distribution),
                backgroundColor: 'rgba(118, 75, 162, 0.8)',
                borderColor: 'rgba(118, 75, 162, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createSkillCategoriesChart() {
    const ctx = document.getElementById('skillCategoriesChart');
    if (!ctx) return;
    const context = ctx.getContext('2d');

    const categories = {
        'Design': ['design', 'ux', 'ui', 'prototype', 'visual', 'graphic'],
        'Development': ['development', 'programming', 'coding', 'front', 'back', 'full'],
        'Management': ['management', 'project', 'team', 'leadership', 'strategy'],
        'Research': ['research', 'analysis', 'data', 'analytics', 'testing'],
        'Business': ['business', 'consulting', 'transformation', 'innovation'],
        'Other': []
    };

    const categoryCounts = {};
    Object.keys(categories).forEach(cat => categoryCounts[cat] = 0);

    Object.keys(skillsData).forEach(skill => {
        let categorized = false;
        const skillLower = skill.toLowerCase();

        for (const [category, keywords] of Object.entries(categories)) {
            if (category === 'Other') continue;
            if (keywords.some(keyword => skillLower.includes(keyword))) {
                categoryCounts[category] += skillsData[skill];
                categorized = true;
                break;
            }
        }

        if (!categorized) {
            categoryCounts['Other'] += skillsData[skill];
        }
    });

    if (charts.skillCategories) charts.skillCategories.destroy();

    charts.skillCategories = new Chart(context, {
        type: 'pie',
        data: {
            labels: Object.keys(categoryCounts),
            datasets: [{
                data: Object.values(categoryCounts),
                backgroundColor: [
                    '#667eea', '#764ba2', '#f093fb', '#f5576c',
                    '#4facfe', '#00f2fe'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function showDashboard() {
    if (mainDashboard) {
        mainDashboard.classList.remove('hidden');
    }
    const fileUploadElement = document.querySelector('.file-upload');
    if (fileUploadElement) {
        fileUploadElement.style.display = 'none';
    }
}

// --- NEW: Function to display unique skills in a modal ---
function showUniqueSkillsModal() {
    uniqueSkillsListContainer.innerHTML = ''; // Clear previous list
    const uniqueSkills = Object.keys(skillsData).sort((a, b) => a.localeCompare(b)); // Get unique skills and sort alphabetically

    if (uniqueSkills.length === 0) {
        uniqueSkillsListContainer.innerHTML = '<p>No unique skills found.</p>';
    } else {
        uniqueSkills.forEach(skill => {
            const skillItem = document.createElement('span');
            skillItem.className = 'skill-item';
            skillItem.textContent = skill;
            uniqueSkillsListContainer.appendChild(skillItem);
        });
    }

    skillsModal.style.display = 'flex'; // Make the modal visible
}