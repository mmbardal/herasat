const fs = require('fs')


function logError(e:Error): void {

    const content = e.message;
    const stack = e.stack;

    fs.writeFile('errors.log',`${Date.now()} - Message: ${content} \n Stack:\n${stack}\n\n`, (err: Error) => {
        if (err) {
            console.error(err)
            return
        }
        //file written successfully
    })


}