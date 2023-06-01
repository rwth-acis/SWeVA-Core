function monitorPromises(promises) {
    const monitoredPromises = promises.map((promise) =>
        promise
            .then((value) => {

                console.log('Promise resolved:', value);

                 return value;
            })
            .catch((error) => {
               console.log('Error detected in ', error);
                return error;
            })
    );

    return Promise.race(monitoredPromises)
        .then((value) => {
            console.log('At least one promise resolved:', value);
            return Promise.all(monitoredPromises);
        })
        .catch((error) => {
            console.log('At least one promise rejected:', error);
            throw error;
        });
}

// Example usage:
const promises = [
    new Promise((resolve) => setTimeout(resolve, 2000, 'Promise 1 resolved')),
    new Promise((resolve) => setTimeout(resolve, 3000, 'Promise 2 resolved')),
    new Promise((_, reject) => setTimeout(reject, 2500, 'Promise 3 rejected')),
];

monitorPromises(promises)
    .then(() => {
        console.log('All promises resolved');
    })
    .catch(() => {
        console.log('At least one promise rejected');
    });