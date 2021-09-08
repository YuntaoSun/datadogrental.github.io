pipeline {
  agent {
  }

  parameters {
    choice( name: 'APP', choices: ['rentals'])
  }
  // exec rentals stats every 4hrs
  triggers {
    parameterizedCron('''
      0 8,12,19 * * * %APP=rentals
    ''')
  }

  stages {
    stage('Env build') {
      steps {
        script {
          retry(5) {
            sh 'ssh-keyscan github.com/ > ~/.ssh/known_hosts'
          }
          withCredentials([string(credentialsId: 'DDAPPLICATIONKEY', variable:'DDAPPLICATIONKEY')]) {
            withCredentials([string(credentialsId: 'DDAPIKEY', variable:'DDAPIKEY')]) {
              sshagent([credentials: ['sshjenkins'] ]) {
                sh "rm -rf node_modules;npm install;node rentals.js"
              }
            }
          }
        }
      }
    }
  }

  post {
    always {
      echo "Cleaning up..."
      cleanWs()
    }
  }
}
