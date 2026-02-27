module.exports = {
    apps: [
        {
            name: 'bot-1',
            script: './dist/index.js',
            env: {
                CONFIG: './config1.yaml',
                DATA_DIR: './src/data1'
            }
        },
        {
            name: 'bot-2',
            script: './dist/index.js',
            env: {
                CONFIG: './config2.yaml',
                DATA_DIR: './src/data2'
            }
        }
    ]
};
